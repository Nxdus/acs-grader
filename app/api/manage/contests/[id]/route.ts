import { ContestScoringType, Prisma, UserLevel } from "@/generated/prisma/client"
import prisma from "@/lib/prisma"
import { computeScore } from "@/lib/scoring"
import { NextResponse } from "next/server"

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

function parseDate(value: unknown) {
  if (typeof value !== "string") return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function parseContestProblems(value: unknown) {
  if (value === undefined) return { ok: true as const, problems: null }
  if (!Array.isArray(value)) return { ok: false as const, error: "Contest problems must be an array." }

  const problems: Array<{ problemId: number; order: number; maxScore: number | null }> = []

  for (const entry of value) {
    const problemId = Number((entry as { problemId?: unknown })?.problemId)
    const order = Number((entry as { order?: unknown })?.order)
    const maxScoreValue = (entry as { maxScore?: unknown })?.maxScore

    if (!Number.isFinite(problemId) || !Number.isFinite(order)) {
      return { ok: false as const, error: "Problem id and order must be valid numbers." }
    }

    let maxScore: number | null = null
    const isEmptyMaxScore =
      maxScoreValue === null ||
      maxScoreValue === undefined ||
      (typeof maxScoreValue === "string" && maxScoreValue.trim() === "")

    if (!isEmptyMaxScore) {
      const numericMaxScore = Number(maxScoreValue)
      if (!Number.isFinite(numericMaxScore) || numericMaxScore < 0) {
        return { ok: false as const, error: "Max score must be a non-negative number." }
      }
      maxScore = Math.trunc(numericMaxScore)
    }

    problems.push({
      problemId: Math.trunc(problemId),
      order: Math.trunc(order),
      maxScore,
    })
  }

  return { ok: true as const, problems }
}

async function recalculateContestProblemScores(
  tx: Prisma.TransactionClient,
  contestId: number,
  problems: Array<{ problemId: number; maxScore: number | null }>,
) {
  const affectedUserIds = new Set<string>()

  for (const problem of problems) {
    const submissions = await tx.submission.findMany({
      where: {
        contestId,
        problemId: problem.problemId,
      },
      select: {
        id: true,
        userId: true,
        results: {
          select: {
            passed: true,
          },
        },
      },
    })

    await Promise.all(
      submissions.map((submission) => {
        affectedUserIds.add(submission.userId)
        return tx.submission.update({
          where: { id: submission.id },
          data: {
            score: computeScore(
              submission.results.filter((result) => result.passed).length,
              problem.maxScore,
            ),
          },
        })
      }),
    )
  }

  await Promise.all(
    Array.from(affectedUserIds).map(async (userId) => {
      const bestByProblem = await tx.submission.groupBy({
        by: ["problemId"],
        where: {
          contestId,
          userId,
        },
        _max: {
          score: true,
        },
      })

      const totalScore = bestByProblem.reduce((sum, item) => sum + (item._max.score ?? 0), 0)

      await tx.contestParticipant.updateMany({
        where: {
          contestId,
          userId,
        },
        data: {
          totalScore,
        },
      })
    }),
  )
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const contestId = Number(id)

    if (!Number.isFinite(contestId)) {
      return NextResponse.json({ error: "Invalid contest id" }, { status: 400 })
    }

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        slug: true,
        title: true,
        level: true,
        description: true,
        startAt: true,
        endAt: true,
        freezeAt: true,
        isPublic: true,
        scoringType: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            problems: true,
            participants: true,
          },
        },
      },
    })

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      level: contest.level,
      description: contest.description,
      startAt: contest.startAt,
      endAt: contest.endAt,
      freezeAt: contest.freezeAt,
      isPublic: contest.isPublic,
      scoringType: contest.scoringType,
      createdAt: contest.createdAt,
      updatedAt: contest.updatedAt,
      problemCount: contest._count.problems,
      participantCount: contest._count.participants,
    })
  } catch (error) {
    console.error("Failed to fetch contest:", error)
    return NextResponse.json({ error: "Failed to fetch contest" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const contestId = Number(id)

    if (!Number.isFinite(contestId)) {
      return NextResponse.json({ error: "Invalid contest id" }, { status: 400 })
    }

    const body = await request.json()
    const hasDescription = Object.prototype.hasOwnProperty.call(body ?? {}, "description")
    const title = normalizeString(body?.title)
    const slug = normalizeSlug(body?.slug)
    const description = typeof body?.description === "string" ? body.description : null
    const isPublic = typeof body?.isPublic === "boolean" ? body.isPublic : undefined
    const scoringType = body?.scoringType
    const level = body?.level
    const contestProblems = parseContestProblems(body?.problems)

    if (!contestProblems.ok) {
      return NextResponse.json({ error: contestProblems.error }, { status: 400 })
    }

    if (scoringType && scoringType !== ContestScoringType.SCORE) {
      return NextResponse.json({ error: "Invalid scoring type." }, { status: 400 })
    }

    if (level && !Object.values(UserLevel).includes(level as UserLevel)) {
      return NextResponse.json({ error: "Invalid level." }, { status: 400 })
    }

    const hasStartAt = Object.prototype.hasOwnProperty.call(body ?? {}, "startAt")
    const hasEndAt = Object.prototype.hasOwnProperty.call(body ?? {}, "endAt")
    const hasFreezeAt = Object.prototype.hasOwnProperty.call(body ?? {}, "freezeAt")
    const startAt = parseDate(body?.startAt)
    const endAt = parseDate(body?.endAt)
    const freezeAt = parseDate(body?.freezeAt)

    if (hasStartAt && !startAt) {
      return NextResponse.json({ error: "Invalid start time." }, { status: 400 })
    }

    if (hasEndAt && !endAt) {
      return NextResponse.json({ error: "Invalid end time." }, { status: 400 })
    }

    if (hasFreezeAt && body?.freezeAt !== null && !freezeAt) {
      return NextResponse.json({ error: "Invalid freeze time." }, { status: 400 })
    }

    if (startAt && endAt && endAt <= startAt) {
      return NextResponse.json({ error: "End time must be after start time." }, { status: 400 })
    }

    if (startAt && freezeAt && freezeAt < startAt) {
      return NextResponse.json(
        { error: "Freeze time must be after start time." },
        { status: 400 },
      )
    }

    if (endAt && freezeAt && freezeAt > endAt) {
      return NextResponse.json(
        { error: "Freeze time must be before end time." },
        { status: 400 },
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const contest = await tx.contest.update({
        where: { id: contestId },
        data: {
          ...(title ? { title } : {}),
          ...(slug ? { slug } : {}),
          ...(level ? { level: level as UserLevel } : {}),
          ...(hasDescription ? { description } : {}),
          ...(startAt ? { startAt } : {}),
          ...(endAt ? { endAt } : {}),
          ...(hasFreezeAt ? { freezeAt: body?.freezeAt === null ? null : freezeAt } : {}),
          ...(isPublic === undefined ? {} : { isPublic }),
          ...(scoringType ? { scoringType: scoringType as ContestScoringType } : {}),
        },
        select: {
          id: true,
          slug: true,
          title: true,
          level: true,
          startAt: true,
          endAt: true,
          isPublic: true,
          scoringType: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (contestProblems.problems) {
        await Promise.all(
          contestProblems.problems.map((problem) =>
            tx.contestProblem.update({
              where: {
                contestId_problemId: {
                  contestId,
                  problemId: problem.problemId,
                },
              },
              data: {
                order: problem.order,
                maxScore: problem.maxScore,
              },
            }),
          ),
        )
        await recalculateContestProblemScores(tx, contestId, contestProblems.problems)
      }

      return contest
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update contest:", error)
    return NextResponse.json({ error: "Failed to update contest" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const contestId = Number(id)

    if (!Number.isFinite(contestId)) {
      return NextResponse.json({ error: "Invalid contest id" }, { status: 400 })
    }

    await prisma.contest.delete({ where: { id: contestId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to delete contest:", error)
    return NextResponse.json({ error: "Failed to delete contest" }, { status: 500 })
  }
}
