import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

type RouteParams = {
  params: Promise<{ id: string; problemId: string }>
}

function parseMaxScore(value: unknown) {
  if (value === undefined) return { ok: true as const, shouldUpdate: false as const }
  if (value === null) return { ok: true as const, shouldUpdate: true as const, value: null }
  if (typeof value === "string" && value.trim() === "") {
    return { ok: true as const, shouldUpdate: true as const, value: null }
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { ok: false as const }
  }

  return { ok: true as const, shouldUpdate: true as const, value: Math.trunc(numeric) }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id, problemId } = await params
    const contestId = Number(id)
    const problemIdNumber = Number(problemId)

    if (!Number.isFinite(contestId) || !Number.isFinite(problemIdNumber)) {
      return NextResponse.json({ error: "Invalid contest or problem id" }, { status: 400 })
    }

    const body = await request.json()
    const orderValue = body?.order !== undefined ? Number(body?.order) : undefined
    const maxScore = parseMaxScore(body?.maxScore)

    if (!maxScore.ok) {
      return NextResponse.json({ error: "Max score must be a non-negative number." }, { status: 400 })
    }

    const updated = await prisma.contestProblem.update({
      where: { contestId_problemId: { contestId, problemId: problemIdNumber } },
      data: {
        ...(Number.isFinite(orderValue) ? { order: Math.trunc(orderValue as number) } : {}),
        ...(maxScore.shouldUpdate ? { maxScore: maxScore.value } : {}),
      },
      include: {
        problem: {
          select: {
            id: true,
            slug: true,
            title: true,
            level: true,
            difficulty: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update contest problem:", error)
    return NextResponse.json({ error: "Failed to update contest problem" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id, problemId } = await params
    const contestId = Number(id)
    const problemIdNumber = Number(problemId)

    if (!Number.isFinite(contestId) || !Number.isFinite(problemIdNumber)) {
      return NextResponse.json({ error: "Invalid contest or problem id" }, { status: 400 })
    }

    await prisma.contestProblem.delete({
      where: { contestId_problemId: { contestId, problemId: problemIdNumber } },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to delete contest problem:", error)
    return NextResponse.json({ error: "Failed to delete contest problem" }, { status: 500 })
  }
}
