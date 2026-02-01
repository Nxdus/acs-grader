import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")?.trim() || null;
    const problemInclude = {
      testCases: {
        select: {
          id: true,
          isSample: true,
        },
      },
      ...(userId
        ? {
            submissions: {
              where: { userId },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                status: true,
              },
            },
          }
        : {}),
    };

    const contest = await prisma.contest.findUnique({
      where: { slug: (await params).slug },
      include: {
        problems: {
          include: {
            problem: {
              include: problemInclude,
            },
          },
          orderBy: {
            order: "asc",
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            rank: "asc",
          },
        },
      },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    if (!userId) {
      return NextResponse.json(contest);
    }

    const contestWithProgress = {
      ...contest,
      problems: contest.problems.map((contestProblem) => {
        const submissions = contestProblem.problem.submissions ?? [];
        return {
          ...contestProblem,
          problem: {
            ...contestProblem.problem,
            hasSubmission: submissions.length > 0,
            submissionStatus: submissions[0]?.status ?? null,
          },
        };
      }),
    };

    return NextResponse.json(contestWithProgress);
  } catch (error) {
    console.error("Failed to fetch contest:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest" },
      { status: 500 },
    );
  }
}
