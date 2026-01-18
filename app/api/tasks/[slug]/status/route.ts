import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
    params: { slug: string } | Promise<{ slug: string }>;
};

const normalizeNumber = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return null;
    return value;
};

export async function GET(request: Request, { params }: RouteContext) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug?.trim();

    if (!slug) {
        return NextResponse.json(
            { error: "Slug is required." },
            { status: 400 },
        );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();

    if (!userId) {
        return NextResponse.json(
            { error: "userId is required." },
            { status: 400 },
        );
    }

    const problem = await prisma.problem.findUnique({
        where: { slug },
        select: { id: true, isPublished: true },
    });

    if (!problem || !problem.isPublished) {
        return NextResponse.json(
            { error: "Task not found." },
            { status: 404 },
        );
    }

    const submission = await prisma.submission.findFirst({
        where: {
            userId,
            problemId: problem.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
            status: true,
            executionTime: true,
            memoryUsed: true,
            createdAt: true,
        },
    });

    if (!submission) {
        return NextResponse.json({
            hasSubmission: false,
        });
    }

    return NextResponse.json({
        hasSubmission: true,
        status: submission.status,
        executionTime: normalizeNumber(submission.executionTime),
        memoryUsed: normalizeNumber(submission.memoryUsed),
        createdAt: submission.createdAt,
    });
}
