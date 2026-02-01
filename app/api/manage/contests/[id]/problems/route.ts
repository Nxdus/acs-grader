import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

type RouteParams = {
  params: Promise<{ id: string }>
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const contestId = Number(id)

    if (!Number.isFinite(contestId)) {
      return NextResponse.json({ error: "Invalid contest id" }, { status: 400 })
    }

    const problems = await prisma.contestProblem.findMany({
      where: { contestId },
      orderBy: { order: "asc" },
      include: {
        problem: {
          select: {
            id: true,
            slug: true,
            title: true,
            difficulty: true,
          },
        },
      },
    })

    return NextResponse.json(
      problems.map((entry) => ({
        contestId: entry.contestId,
        problemId: entry.problemId,
        order: entry.order,
        maxScore: entry.maxScore,
        problem: entry.problem,
      })),
    )
  } catch (error) {
    console.error("Failed to fetch contest problems:", error)
    return NextResponse.json({ error: "Failed to fetch contest problems" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const contestId = Number(id)

    if (!Number.isFinite(contestId)) {
      return NextResponse.json({ error: "Invalid contest id" }, { status: 400 })
    }

    const body = await request.json()
    const problemIdValue = Number(body?.problemId)
    const problemSlug = normalizeString(body?.problemSlug)
    const maxScore = body?.maxScore !== undefined ? Number(body?.maxScore) : undefined
    const orderValue = body?.order !== undefined ? Number(body?.order) : undefined

    let problemId = Number.isFinite(problemIdValue) ? problemIdValue : null
    if (!problemId && problemSlug) {
      const problem = await prisma.problem.findUnique({
        where: { slug: problemSlug },
        select: { id: true },
      })
      problemId = problem?.id ?? null
    }

    if (!problemId) {
      return NextResponse.json({ error: "Problem not found." }, { status: 404 })
    }

    const existing = await prisma.contestProblem.findUnique({
      where: { contestId_problemId: { contestId, problemId } },
    })

    if (existing) {
      return NextResponse.json({ error: "Problem already in contest." }, { status: 409 })
    }

    const order =
      Number.isFinite(orderValue) && orderValue !== undefined
        ? Math.trunc(orderValue)
        : undefined

    let finalOrder = order
    if (finalOrder === undefined) {
      const maxOrder = await prisma.contestProblem.aggregate({
        where: { contestId },
        _max: { order: true },
      })
      finalOrder = (maxOrder._max.order ?? 0) + 1
    }

    const created = await prisma.contestProblem.create({
      data: {
        contestId,
        problemId,
        order: finalOrder,
        maxScore: Number.isFinite(maxScore) ? Math.trunc(maxScore as number) : null,
      },
      include: {
        problem: {
          select: {
            id: true,
            slug: true,
            title: true,
            difficulty: true,
          },
        },
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Failed to add contest problem:", error)
    return NextResponse.json({ error: "Failed to add contest problem" }, { status: 500 })
  }
}
