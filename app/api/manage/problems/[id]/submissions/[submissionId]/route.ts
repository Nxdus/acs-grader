import { NextResponse } from "next/server"
import { SubmissionStatus } from "@/generated/prisma/client"
import prisma from "@/lib/prisma"

type RouteParams = {
  params: Promise<{ id: string; submissionId: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id, submissionId } = await params
    const problemId = Number(id)
    const parsedSubmissionId = Number(submissionId)

    if (!Number.isInteger(problemId) || problemId <= 0) {
      return NextResponse.json({ error: "Invalid problem id." }, { status: 400 })
    }

    if (!Number.isInteger(parsedSubmissionId) || parsedSubmissionId <= 0) {
      return NextResponse.json({ error: "Invalid submission id." }, { status: 400 })
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: parsedSubmissionId,
        problemId,
      },
      select: {
        id: true,
        code: true,
        status: true,
        language: true,
        languageId: true,
        executionTime: true,
        memoryUsed: true,
        score: true,
        contestId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        problem: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        contest: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        results: {
          orderBy: { testCaseId: "asc" },
          select: {
            id: true,
            testCaseId: true,
            actualOutput: true,
            passed: true,
            runtime: true,
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error("Failed to fetch submission:", error)
    return NextResponse.json({ error: "Failed to fetch submission." }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id, submissionId } = await params
    const problemId = Number(id)
    const parsedSubmissionId = Number(submissionId)

    if (!Number.isInteger(problemId) || problemId <= 0) {
      return NextResponse.json({ error: "Invalid problem id." }, { status: 400 })
    }

    if (!Number.isInteger(parsedSubmissionId) || parsedSubmissionId <= 0) {
      return NextResponse.json({ error: "Invalid submission id." }, { status: 400 })
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: parsedSubmissionId,
        problemId,
      },
      select: {
        id: true,
        contestId: true,
        userId: true,
      },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.submissionResult.deleteMany({ where: { submissionId: submission.id } })
      await tx.submission.delete({ where: { id: submission.id } })

      const [participants, acceptedParticipants] = await Promise.all([
        tx.submission.groupBy({
          by: ["userId"],
          where: { problemId },
        }),
        tx.submission.groupBy({
          by: ["userId"],
          where: { problemId, status: SubmissionStatus.ACCEPTED },
        }),
      ])

      await tx.problem.update({
        where: { id: problemId },
        data: {
          participantCount: participants.length,
          successCount: acceptedParticipants.length,
        },
      })

      if (submission.contestId !== null) {
        const [bestByProblem, lastSubmission] = await Promise.all([
          tx.submission.groupBy({
            by: ["problemId"],
            where: {
              contestId: submission.contestId,
              userId: submission.userId,
            },
            _max: {
              score: true,
            },
          }),
          tx.submission.findFirst({
            where: {
              contestId: submission.contestId,
              userId: submission.userId,
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
        ])

        const totalScore = bestByProblem.reduce(
          (sum, entry) => sum + (entry._max.score ?? 0),
          0,
        )

        await tx.contestParticipant.updateMany({
          where: {
            contestId: submission.contestId,
            userId: submission.userId,
          },
          data: {
            totalScore,
            lastSubmitAt: lastSubmission?.createdAt ?? null,
          },
        })
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to delete submission:", error)
    return NextResponse.json({ error: "Failed to delete submission." }, { status: 500 })
  }
}
