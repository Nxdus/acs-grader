import { NextResponse } from "next/server"
import { Prisma, SubmissionStatus } from "@/generated/prisma/client"
import prisma from "@/lib/prisma"

type RouteParams = {
  params: Promise<{ id: string }>
}

const sortableFields = new Set([
  "performance",
  "createdAt",
  "score",
  "executionTime",
  "memoryUsed",
  "status",
])

function normalizeNumber(value: string | null, fallback: number) {
  const parsed = Number(value ?? fallback)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

function buildOrderBy(sort: string, direction: "asc" | "desc") {
  if (sort === "performance") {
    return [
      { score: Prisma.SortOrder.desc },
      { executionTime: Prisma.SortOrder.asc },
      { memoryUsed: Prisma.SortOrder.asc },
      { createdAt: Prisma.SortOrder.asc },
    ]
  }

  if (!sortableFields.has(sort)) {
    return [{ score: Prisma.SortOrder.desc }, { executionTime: Prisma.SortOrder.asc }]
  }

  return [{ [sort]: direction }]
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const problemId = Number(id)

    if (!Number.isInteger(problemId) || problemId <= 0) {
      return NextResponse.json({ error: "Invalid problem id." }, { status: 400 })
    }

    const url = new URL(request.url)
    const search = url.searchParams.get("search")?.trim()
    const status = url.searchParams.get("status")
    const sort = url.searchParams.get("sort") ?? "performance"
    const direction = url.searchParams.get("dir") === "desc" ? "desc" : "asc"
    const page = Math.max(1, normalizeNumber(url.searchParams.get("page"), 1))
    const pageSize = Math.max(1, Math.min(100, normalizeNumber(url.searchParams.get("pageSize"), 20)))

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, slug: true, title: true },
    })

    if (!problem) {
      return NextResponse.json({ error: "Problem not found." }, { status: 404 })
    }

    const where: Prisma.SubmissionWhereInput = {
      problemId,
      ...(status && Object.values(SubmissionStatus).includes(status as SubmissionStatus)
        ? { status: status as SubmissionStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
              { language: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const [total, items, accepted, attempted] = await prisma.$transaction([
      prisma.submission.count({ where }),
      prisma.submission.findMany({
        where,
        orderBy: buildOrderBy(sort, direction),
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          status: true,
          language: true,
          languageId: true,
          executionTime: true,
          memoryUsed: true,
          score: true,
          contestId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contest: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
          results: {
            select: {
              id: true,
              passed: true,
            },
          },
        },
      }),
      prisma.submission.count({ where: { ...where, status: SubmissionStatus.ACCEPTED } }),
      prisma.submission.count({ where: { problemId } }),
    ])

    return NextResponse.json({
      problem,
      items: items.map((submission) => ({
        ...submission,
        passedCount: submission.results.filter((result) => result.passed).length,
        resultCount: submission.results.length,
        results: undefined,
      })),
      total,
      page,
      pageSize,
      stats: {
        accepted,
        attempted,
      },
    })
  } catch (error) {
    console.error("Failed to fetch problem submissions:", error)
    return NextResponse.json({ error: "Failed to fetch submissions." }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const problemId = Number(id)

    if (!Number.isInteger(problemId) || problemId <= 0) {
      return NextResponse.json({ error: "Invalid problem id." }, { status: 400 })
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    })

    if (!problem) {
      return NextResponse.json({ error: "Problem not found." }, { status: 404 })
    }

    const deletedCount = await prisma.$transaction(async (tx) => {
      const affectedContestParticipants = await tx.submission.findMany({
        where: {
          problemId,
          contestId: { not: null },
        },
        distinct: ["contestId", "userId"],
        select: {
          contestId: true,
          userId: true,
        },
      })

      await tx.submissionResult.deleteMany({
        where: {
          submission: { problemId },
        },
      })

      const deleted = await tx.submission.deleteMany({ where: { problemId } })

      await tx.problem.update({
        where: { id: problemId },
        data: {
          participantCount: 0,
          successCount: 0,
        },
      })

      for (const participant of affectedContestParticipants) {
        if (participant.contestId === null) continue

        const [bestByProblem, lastSubmission] = await Promise.all([
          tx.submission.groupBy({
            by: ["problemId"],
            where: {
              contestId: participant.contestId,
              userId: participant.userId,
            },
            _max: {
              score: true,
            },
          }),
          tx.submission.findFirst({
            where: {
              contestId: participant.contestId,
              userId: participant.userId,
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
        ])

        const totalScore = bestByProblem.reduce(
          (sum, entry) => sum + (entry._max.score ?? 0),
          0,
        )

        await tx.contestParticipant.updateMany({
          where: {
            contestId: participant.contestId,
            userId: participant.userId,
          },
          data: {
            totalScore,
            lastSubmitAt: lastSubmission?.createdAt ?? null,
          },
        })
      }

      return deleted.count
    })

    return NextResponse.json({ ok: true, deletedCount })
  } catch (error) {
    console.error("Failed to clear problem submissions:", error)
    return NextResponse.json({ error: "Failed to clear submissions." }, { status: 500 })
  }
}
