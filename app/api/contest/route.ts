import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
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
