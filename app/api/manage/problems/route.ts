import { NextResponse } from "next/server"
import { Difficulty, Prisma } from "@/generated/prisma/client"
import prisma from "@/lib/prisma"

const sortableFields = new Set([
  "createdAt",
  "updatedAt",
  "title",
  "difficulty",
  "participantCount",
  "successCount",
])

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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const search = normalizeString(url.searchParams.get("search"))
    const difficulty = url.searchParams.get("difficulty")
    const published = url.searchParams.get("published")
    const sort = url.searchParams.get("sort") ?? "updatedAt"
    const direction = url.searchParams.get("dir") === "asc" ? "asc" : "desc"
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"))
    const pageSize = Math.max(
      1,
      Math.min(50, Number(url.searchParams.get("pageSize") ?? "20")),
    )

    const where: Prisma.ProblemWhereInput = {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(difficulty && Object.values(Difficulty).includes(difficulty as Difficulty)
        ? { difficulty: difficulty as Difficulty }
        : {}),
      ...(published === "true" ? { isPublished: true } : {}),
      ...(published === "false" ? { isPublished: false } : {}),
    }

    const orderBy = sortableFields.has(sort) ? { [sort]: direction } : { updatedAt: "desc" }

    const [total, items, publishedCount, draftCount] = await prisma.$transaction([
      prisma.problem.count({ where }),
      prisma.problem.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          isPublished: true,
          participantCount: true,
          successCount: true,
          createdAt: true,
          updatedAt: true,
          tags: {
            include: {
              tag: true,
            },
          },
          testCases: {
            select: { id: true },
          },
        },
      }),
      prisma.problem.count({ where: { ...where, isPublished: true } }),
      prisma.problem.count({ where: { ...where, isPublished: false } }),
    ])

    const mapped = items.map((problem) => ({
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      isPublished: problem.isPublished,
      participantCount: problem.participantCount,
      successCount: problem.successCount,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
      tags: problem.tags.map((entry) => entry.tag.name),
      testCaseCount: problem.testCases.length,
    }))

    return NextResponse.json({
      items: mapped,
      total,
      page,
      pageSize,
      stats: {
        published: publishedCount,
        drafts: draftCount,
      },
    })
  } catch (error) {
    console.error("Failed to fetch problems:", error)
    return NextResponse.json({ error: "Failed to fetch problems" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const title = normalizeString(body?.title)
    const slug = normalizeSlug(body?.slug)
    const difficulty = body?.difficulty
    const description = typeof body?.description === "string" ? body.description : null
    const constraints = typeof body?.constraints === "string" ? body.constraints : null
    const inputFormat = typeof body?.inputFormat === "string" ? body.inputFormat : null
    const outputFormat = typeof body?.outputFormat === "string" ? body.outputFormat : null
    const isPublished = typeof body?.isPublished === "boolean" ? body.isPublished : true

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required." }, { status: 400 })
    }

    if (!Object.values(Difficulty).includes(difficulty as Difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 })
    }

    const allowedLanguageIds = normalizeAllowedLanguages(body?.allowedLanguageIds)
    const tags = normalizeTags(body?.tags)
    const testCases = normalizeTestCases(body?.testCases)

    const problem = await prisma.problem.create({
      data: {
        slug,
        title,
        description,
        difficulty: difficulty as Difficulty,
        constraints,
        inputFormat,
        outputFormat,
        allowedLanguageIds,
        isPublished,
        tags: {
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

    return NextResponse.json(problem, { status: 201 })
  } catch (error) {
    console.error("Failed to create problem:", error)
    return NextResponse.json({ error: "Failed to create problem" }, { status: 500 })
  }
}
