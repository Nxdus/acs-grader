import { ContestScoringType, Prisma } from "@/generated/prisma/client"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const sortableFields = new Set(["createdAt", "updatedAt", "title", "startAt", "endAt"])

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

function getContestStatus(startAt: Date, endAt: Date) {
  const now = new Date()
  if (startAt > now) return "Upcoming"
  if (endAt < now) return "Ended"
  return "Active"
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const search = normalizeString(url.searchParams.get("search"))
    const visibility = url.searchParams.get("public")
    const scoringType = url.searchParams.get("scoringType")
    const status = url.searchParams.get("status")
    const sort = url.searchParams.get("sort") ?? "updatedAt"
    const direction = url.searchParams.get("dir") === "asc" ? "asc" : "desc"
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"))
    const pageSize = Math.max(
      1,
      Math.min(50, Number(url.searchParams.get("pageSize") ?? "20")),
    )

    const now = new Date()

    const where: Prisma.ContestWhereInput = {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(visibility === "true" ? { isPublic: true } : {}),
      ...(visibility === "false" ? { isPublic: false } : {}),
      ...(scoringType &&
      Object.values(ContestScoringType).includes(scoringType as ContestScoringType)
        ? { scoringType: scoringType as ContestScoringType }
        : {}),
      ...(status === "Upcoming" ? { startAt: { gt: now } } : {}),
      ...(status === "Ended" ? { endAt: { lt: now } } : {}),
      ...(status === "Active"
        ? {
            AND: [{ startAt: { lte: now } }, { endAt: { gte: now } }],
          }
        : {}),
    }

    const orderBy = sortableFields.has(sort)
      ? { [sort]: direction }
      : { updatedAt: Prisma.SortOrder.desc }

    const [total, items, publicCount, privateCount] = await prisma.$transaction([
      prisma.contest.count({ where }),
      prisma.contest.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      }),
      prisma.contest.count({ where: { ...where, isPublic: true } }),
      prisma.contest.count({ where: { ...where, isPublic: false } }),
    ])

    const mapped = items.map((contest) => ({
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
      status: getContestStatus(contest.startAt, contest.endAt),
    }))

    return NextResponse.json({
      items: mapped,
      total,
      page,
      pageSize,
      stats: {
        public: publicCount,
        private: privateCount,
      },
    })
  } catch (error) {
    console.error("Failed to fetch contests:", error)
    return NextResponse.json({ error: "Failed to fetch contests" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const title = normalizeString(body?.title)
    const slug = normalizeSlug(body?.slug)
    const description = typeof body?.description === "string" ? body.description : null
    const isPublic = typeof body?.isPublic === "boolean" ? body.isPublic : true
    const scoringType = body?.scoringType

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required." }, { status: 400 })
    }

    if (scoringType !== ContestScoringType.SCORE) {
      return NextResponse.json({ error: "Invalid scoring type." }, { status: 400 })
    }

    const startAt = parseDate(body?.startAt)
    const endAt = parseDate(body?.endAt)
    const freezeAt = parseDate(body?.freezeAt)

    if (!startAt || !endAt) {
      return NextResponse.json({ error: "Start and end time are required." }, { status: 400 })
    }

    if (endAt <= startAt) {
      return NextResponse.json({ error: "End time must be after start time." }, { status: 400 })
    }

    if (freezeAt && (freezeAt < startAt || freezeAt > endAt)) {
      return NextResponse.json(
        { error: "Freeze time must be between start and end time." },
        { status: 400 },
      )
    }

    const contest = await prisma.contest.create({
      data: {
        slug,
        title,
        description,
        startAt,
        endAt,
        freezeAt,
        isPublic,
        scoringType: scoringType as ContestScoringType,
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

    return NextResponse.json(contest, { status: 201 })
  } catch (error) {
    console.error("Failed to create contest:", error)
    return NextResponse.json({ error: "Failed to create contest" }, { status: 500 })
  }
}
