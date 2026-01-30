import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const contest = await prisma.contest.findUnique({
      where: { slug: (await params).slug },
      include: {
        problems: {
          include: {
            problem: {
              include: {
                testCases: {
                  select: {
                    id: true,
                    isSample: true,
                  },
                },
              },
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

    return NextResponse.json(contest);
  } catch (error) {
    console.error("Failed to fetch contest:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest" },
      { status: 500 },
    );
  }
}
