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

    await prisma.contestParticipant.upsert({
      where: {
        contestId_userId: {
          contestId,
          userId: session.user.id,
        },
      },
      update: {},
      create: {
        contestId,
        userId: session.user.id,
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
