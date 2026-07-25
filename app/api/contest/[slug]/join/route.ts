import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getContestStatus } from "@/lib/contest/schedule";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const { slug } = await params;

    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contestId = Number(slug);
    const userId = session.user.id;

    if (!Number.isInteger(contestId) || contestId <= 0) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { startAt: true, endAt: true },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const contestStatus = getContestStatus(contest.startAt, contest.endAt);
    if (contestStatus === "upcoming") {
      return NextResponse.json(
        { error: "Contest has not started yet." },
        { status: 403 },
      );
    }
    if (contestStatus === "ended") {
      return NextResponse.json(
        { error: "Contest has ended." },
        { status: 403 },
      );
    }

    const alreadyJoined = await prisma.contestParticipant.findUnique({
      where: {
        contestId_userId: {
          contestId,
          userId,
        },
      },
    });

    if (alreadyJoined) {
      return NextResponse.json({
        success: true,
        joined: true,
        message: "Already joined",
      });
    }

    await prisma.contestParticipant.create({
      data: {
        contestId,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to join contest:", error);
    return NextResponse.json(
      { error: "Failed to join contest" },
      { status: 500 },
    );
  }
}
