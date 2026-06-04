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

      await prisma.$transaction(async (tx) => {
        const ranked = await tx.contestParticipant.updateMany({
          where: {
            contestId: contest.id,
            userId: p.userId,
            rank: null,
          },
          data: { rank: i + 1 },
        });

        if (ranked.count === 0) {
          return;
        }

        await tx.user.update({
          where: { id: p.userId },
          data: {
            attended: {
              increment: 1,
            },
            score: {
              increment: p.totalScore,
            },
          },
        });
      });
    }
  }

  return contests.length;
}
