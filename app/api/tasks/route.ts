import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

const isAllowedDifficulty = (value: string | null) =>
  value === "EASY" || value === "MEDIUM" || value === "HARD";

const toNumber = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search")?.trim();
  const difficulty = searchParams.get("difficulty");
  const tag = searchParams.get("tag")?.trim();
  const includeUnpublished = searchParams.get("published") === "false";
  const userId = searchParams.get("userId")?.trim();

  const takeRaw = toNumber(searchParams.get("take"));
  const skipRaw = toNumber(searchParams.get("skip"));

  const take =
    typeof takeRaw === "number"
      ? Math.min(Math.max(1, takeRaw), MAX_TAKE)
      : DEFAULT_TAKE;
  const skip = typeof skipRaw === "number" ? Math.max(0, skipRaw) : 0;

  const where: Prisma.ProblemWhereInput = {};

  if (!includeUnpublished) {
    where.isPublished = true;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isAllowedDifficulty(difficulty)) {
    where.difficulty = difficulty;
  }

  if (tag) {
    where.tags = {
      some: {
        tag: {
          name: { equals: tag, mode: "insensitive" },
        },
      },
    };
  }

  const baseInclude = {
    tags: {
      include: {
        tag: true,
      },
    },
    contestProblems: {
      include: {
        contest: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    },
  } satisfies Prisma.ProblemInclude;

  if (userId) {
    const problems = await prisma.problem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        ...baseInclude,
        submissions: {
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            status: true,
          },
        },
      },
    });

    const items = problems.map((problem) => ({
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      participantCount: problem.participantCount,
      successCount: problem.successCount,
      hasSubmission: problem.submissions.length > 0,
      submissionStatus: problem.submissions[0]?.status ?? null,
      tags: problem.tags.map((entry) => entry.tag.name),
      contestProblems: problem.contestProblems.map((cp) => ({
        contestId: cp.contestId,
        contest: cp.contest,
      })),
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    }));

    return NextResponse.json({
      items,
      total: items.length,
      take,
      skip,
    });
  }

  const problems = await prisma.problem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: baseInclude,
  });

  const items = problems.map((problem) => ({
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    participantCount: problem.participantCount,
    successCount: problem.successCount,
    tags: problem.tags.map((entry) => entry.tag.name),
    contestProblems: problem.contestProblems.map((cp) => ({
      contestId: cp.contestId,
      contest: cp.contest,
    })),
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
  }));

  return NextResponse.json({
    items,
    total: items.length,
    take,
    skip,
  });
}
