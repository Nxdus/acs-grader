import prisma from "@/lib/prisma";
import { Prisma, UserLevel } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { finishExpiredContests } from "@/lib/contest/finish";

export async function GET(request: NextRequest) {
  try {
    await finishExpiredContests();

    const level = request.nextUrl.searchParams.get("level");
    const where: Prisma.ContestWhereInput = {};

    if (level && Object.values(UserLevel).includes(level as UserLevel)) {
      where.level = level as UserLevel;
    }

    const contests = await prisma.contest.findMany({
      where,
      orderBy: {
        startAt: "desc",
      },
      include: {
        problems: true,
        participants: true,
      },
    });

    return NextResponse.json(contests);
  } catch (error) {
    console.error("Failed to fetch contests:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 },
    );
  }
}
