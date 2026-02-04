import { NextResponse } from "next/server"
import { Difficulty } from "@/generated/prisma/client"
import prisma from "@/lib/prisma"

type RouteParams = {
  params: Promise<{ id: string }>
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function normalizeSlug(value: unknown) {
  return normalizeString(value).toLowerCase()
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return []
  const unique = new Set<string>()
  for (const entry of value) {
    if (typeof entry !== "string") continue
    const trimmed = entry.trim()
    if (!trimmed) continue
    unique.add(trimmed)
  }
  return Array.from(unique)
}

function normalizeAllowedLanguages(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.trunc(entry))
}

function normalizeTestCases(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const input = normalizeString((entry as { input?: unknown }).input)
      const output = normalizeString((entry as { output?: unknown }).output)
      const isSample =
        typeof (entry as { isSample?: unknown }).isSample === "boolean"
          ? (entry as { isSample?: boolean }).isSample
          : false
      if (!input || !output) return null
      return { input, output, isSample }
    })
    .filter((entry): entry is { input: string; output: string; isSample: boolean } => Boolean(entry))
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const problemId = Number(id)

    if (!Number.isFinite(problemId)) {
      return NextResponse.json({ error: "Invalid problem id" }, { status: 400 })
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        tags: { include: { tag: true } },
        testCases: true,
        contestProblems: {
          include: {
            contest: {
              select: { id: true, title: true },
            },
          },
        },
      },
    })

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      constraints: problem.constraints,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      allowedLanguageIds: problem.allowedLanguageIds ?? [],
      isPublished: problem.isPublished,
      participantCount: problem.participantCount,
      successCount: problem.successCount,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
      tags: problem.tags.map((entry) => entry.tag.name),
      contests: problem.contestProblems.map((entry) => entry.contest),
      contestId: problem.contestProblems[0]?.contestId ?? null,
      testCases: problem.testCases.map((testCase) => ({
        id: testCase.id,
        input: testCase.input,
        output: testCase.output,
        isSample: testCase.isSample,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch problem:", error)
    return NextResponse.json({ error: "Failed to fetch problem" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const problemId = Number(id)

    if (!Number.isFinite(problemId)) {
      return NextResponse.json({ error: "Invalid problem id" }, { status: 400 })
    }

    const body = await request.json()
    const title = normalizeString(body?.title)
    const slug = normalizeSlug(body?.slug)
    const difficulty = body?.difficulty
    const description = typeof body?.description === "string" ? body.description : null
    const constraints = typeof body?.constraints === "string" ? body.constraints : null
    const inputFormat = typeof body?.inputFormat === "string" ? body.inputFormat : null
    const outputFormat = typeof body?.outputFormat === "string" ? body.outputFormat : null
    const isPublished = typeof body?.isPublished === "boolean" ? body.isPublished : undefined
    const contestIdValue = body?.contestId

    if (difficulty && !Object.values(Difficulty).includes(difficulty as Difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 })
    }

    const contestId =
      contestIdValue === null
        ? null
        : contestIdValue === undefined
          ? undefined
          : Number(contestIdValue)

    if (contestId !== null && contestId !== undefined && !Number.isFinite(contestId)) {
      return NextResponse.json({ error: "Invalid contest id." }, { status: 400 })
    }

    const allowedLanguageIds = normalizeAllowedLanguages(body?.allowedLanguageIds)
    const tags = normalizeTags(body?.tags)
    const testCases = normalizeTestCases(body?.testCases)

    const updated = await prisma.$transaction(async (tx) => {
      if (testCases.length > 0) {
        await tx.submissionResult.deleteMany({
          where: {
            testCase: { problemId },
          },
        })
      }

      const saved = await tx.problem.update({
        where: { id: problemId },
        data: {
          ...(title ? { title } : {}),
          ...(slug ? { slug } : {}),
          ...(difficulty ? { difficulty: difficulty as Difficulty } : {}),
          description,
          constraints,
          inputFormat,
          outputFormat,
          ...(isPublished === undefined ? {} : { isPublished }),
          allowedLanguageIds,
          tags: {
            deleteMany: {},
            create: tags.map((name) => ({
              tag: {
                connectOrCreate: {
                  where: { name },
                  create: { name },
                },
              },
            })),
          },
          testCases: {
            deleteMany: {},
            create: testCases.map((testCase) => ({
              input: testCase.input,
              output: testCase.output,
              isSample: testCase.isSample,
            })),
          },
        },
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (contestIdValue !== undefined) {
        if (contestId === null) {
          await tx.contestProblem.deleteMany({ where: { problemId } })
        } else if (contestId !== undefined) {
          await tx.contestProblem.deleteMany({
            where: { problemId, contestId: { not: contestId } },
          })

          const existing = await tx.contestProblem.findUnique({
            where: { contestId_problemId: { contestId, problemId } },
          })

          if (!existing) {
            const maxOrder = await tx.contestProblem.aggregate({
              where: { contestId },
              _max: { order: true },
            })

            await tx.contestProblem.create({
              data: {
                contestId,
                problemId,
                order: (maxOrder._max.order ?? 0) + 1,
              },
            })
          }
        }
      }

      return saved
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update problem:", error)
    return NextResponse.json({ error: "Failed to update problem" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const problemId = Number(id)

    if (!Number.isFinite(problemId)) {
      return NextResponse.json({ error: "Invalid problem id" }, { status: 400 })
    }

    await prisma.problem.delete({ where: { id: problemId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to delete problem:", error)
    return NextResponse.json({ error: "Failed to delete problem" }, { status: 500 })
  }
}
