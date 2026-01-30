-- CreateEnum
CREATE TYPE "ContestScoringType" AS ENUM ('ACM', 'SCORE');

-- CreateTable
CREATE TABLE "contest" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "scoringType" "ContestScoringType" NOT NULL,
    "freezeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_problem" (
    "contestId" INTEGER NOT NULL,
    "problemId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "maxScore" INTEGER,

    CONSTRAINT "contest_problem_pkey" PRIMARY KEY ("contestId","problemId")
);

-- CreateTable
CREATE TABLE "contest_participant" (
    "contestId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "penalty" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "lastSubmitAt" TIMESTAMP(3),

    CONSTRAINT "contest_participant_pkey" PRIMARY KEY ("contestId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "contest_slug_key" ON "contest"("slug");

-- AddForeignKey
ALTER TABLE "contest_problem" ADD CONSTRAINT "contest_problem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_problem" ADD CONSTRAINT "contest_problem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participant" ADD CONSTRAINT "contest_participant_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participant" ADD CONSTRAINT "contest_participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
