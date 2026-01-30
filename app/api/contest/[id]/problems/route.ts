import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const contestId = Number(params.id);

    const problems = await prisma.contestProblem.findMany({
      where: { contestId },
      orderBy: { order: "asc" },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
    });

    return NextResponse.json(problems);
  } catch (error) {
    console.error("Failed to fetch contest problems:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest problems" },
      { status: 500 },
    );
  }
}
