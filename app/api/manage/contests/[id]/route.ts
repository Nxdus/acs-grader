import { ContestScoringType } from "@/generated/prisma/client"
import prisma from "@/lib/prisma"
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
    const title = normalizeString(body?.title)
    const slug = normalizeSlug(body?.slug)
    const description = typeof body?.description === "string" ? body.description : null
    const isPublic = typeof body?.isPublic === "boolean" ? body.isPublic : undefined
    const scoringType = body?.scoringType

    if (scoringType && scoringType !== ContestScoringType.SCORE) {
      return NextResponse.json({ error: "Invalid scoring type." }, { status: 400 })
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

    const updated = await prisma.contest.update({
      where: { id: contestId },
      data: {
        ...(title ? { title } : {}),
        ...(slug ? { slug } : {}),
        description,
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
        startAt: true,
        endAt: true,
        isPublic: true,
        scoringType: true,
        createdAt: true,
        updatedAt: true,
      },
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
