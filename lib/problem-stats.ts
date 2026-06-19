import { SubmissionStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

type ProblemStats = {
  participantCount: number;
  successCount: number;
};

const emptyStats = (): ProblemStats => ({
  participantCount: 0,
  successCount: 0,
});

export async function getProblemStats(problemIds: number[]) {
  const uniqueProblemIds = Array.from(new Set(problemIds));
  const stats = new Map<number, ProblemStats>();

  for (const problemId of uniqueProblemIds) {
    stats.set(problemId, emptyStats());
  }

  if (uniqueProblemIds.length === 0) {
    return stats;
  }

  const [participants, acceptedParticipants] = await Promise.all([
    prisma.submission.groupBy({
      by: ["problemId", "userId"],
      where: {
        problemId: { in: uniqueProblemIds },
      },
    }),
    prisma.submission.groupBy({
      by: ["problemId", "userId"],
      where: {
        problemId: { in: uniqueProblemIds },
        status: SubmissionStatus.ACCEPTED,
      },
    }),
  ]);

  for (const participant of participants) {
    const current = stats.get(participant.problemId) ?? emptyStats();
    current.participantCount += 1;
    stats.set(participant.problemId, current);
  }

  for (const participant of acceptedParticipants) {
    const current = stats.get(participant.problemId) ?? emptyStats();
    current.successCount += 1;
    stats.set(participant.problemId, current);
  }

  return stats;
}
