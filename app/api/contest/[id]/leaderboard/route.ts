import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const contestId = Number(params.id);

    const leaderboard = await prisma.contestParticipant.findMany({
      where: { contestId },
      orderBy: [{ totalScore: "desc" }, { penalty: "asc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Failed to fetch contest leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest leaderboard" },
      { status: 500 },
    );
  }
}
