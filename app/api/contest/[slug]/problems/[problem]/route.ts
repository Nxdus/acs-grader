import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ problem: string }> },
) {
  try {
    const problemSlug = (await params).problem;

    const response = await prisma.contestProblem.findFirst({
      where: {
        problem: {
          slug: problemSlug,
        },
      },
      orderBy: { order: "asc" },
      include: {
        problem: {
          include: {
            testCases: {
              where: { isSample: true },
              orderBy: { id: "asc" },
              select: {
                id: true,
                input: true,
                output: true,
                isSample: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      contestId: response?.contestId,
      problemId: response?.problemId,
      order: response?.order,
      maxScore: response?.maxScore,
      problem: {
        slug: response?.problem.slug,
        title: response?.problem.title,
        description: response?.problem.description,
        constraints: response?.problem.constraints,
        inputFormat: response?.problem.inputFormat,
        outputFormat: response?.problem.outputFormat,
        allowedLanguageIds: response?.problem.allowedLanguageIds,
        testCases: response?.problem.testCases,
      },
    });
  } catch (error) {
    console.error("Failed to fetch contest problems:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest problems" },
      { status: 500 },
    );
  }
}
