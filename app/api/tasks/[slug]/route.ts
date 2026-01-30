import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const safeSlug = slug?.trim();

  if (!safeSlug) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400 });
  }

  const problem = await prisma.problem.findFirst({
    where: {
      OR: [
        isNaN(Number(safeSlug)) ? { slug: safeSlug } : { id: Number(safeSlug) },
      ],
      isPublished: true,
    },
    include: {
      tags: {
        include: { tag: true },
      },
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
  });

  if (!problem || !problem.isPublished) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    constraints: problem.constraints,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    allowedLanguageIds: problem.allowedLanguageIds ?? [],
    participantCount: problem.participantCount,
    successCount: problem.successCount,
    tags: problem.tags.map(
      (entry: { tag: { name: string } }) => entry.tag.name,
    ),
    testCases: problem.testCases,
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
  });
}
