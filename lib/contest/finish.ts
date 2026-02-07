import prisma from "@/lib/prisma";

export async function finishExpiredContests() {
  const contests = await prisma.contest.findMany({
    where: {
      endAt: { lt: new Date() },
      participants: {
        some: {
          rank: null,
        },
      },
    },
    include: {
      participants: true,
    },
  });

  for (const contest of contests) {
    const sorted = contest.participants.sort(
      (a, b) => b.totalScore - a.totalScore || a.penalty - b.penalty,
    );

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];

      await prisma.contestParticipant.update({
        where: {
          contestId_userId: {
            contestId: contest.id,
            userId: p.userId,
          },
        },
        data: { rank: i + 1 },
      });

      await prisma.user.update({
        where: { id: p.userId },
        data: {
          score: {
            increment: p.totalScore,
          },
        },
      });
    }
  }

  return contests.length;
}
