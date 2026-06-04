import { NextResponse } from "next/server";
import { finishExpiredContests } from "@/lib/contest/finish";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await finishExpiredContests();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        score: true,
        attended: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
      },
      orderBy: {
        score: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 },
    );
  }
}
