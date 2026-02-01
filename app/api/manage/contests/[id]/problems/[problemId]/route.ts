import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

type RouteParams = {
  params: Promise<{ id: string; problemId: string }>
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
    const maxScoreValue = body?.maxScore !== undefined ? Number(body?.maxScore) : undefined

    const updated = await prisma.contestProblem.update({
      where: { contestId_problemId: { contestId, problemId: problemIdNumber } },
      data: {
        ...(Number.isFinite(orderValue) ? { order: Math.trunc(orderValue as number) } : {}),
        ...(maxScoreValue === undefined
          ? {}
          : { maxScore: Number.isFinite(maxScoreValue) ? Math.trunc(maxScoreValue as number) : null }),
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
