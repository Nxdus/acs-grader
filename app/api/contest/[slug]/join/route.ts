import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
