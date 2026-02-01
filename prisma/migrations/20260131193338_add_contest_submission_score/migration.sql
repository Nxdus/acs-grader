-- AlterTable
ALTER TABLE "submission" ADD COLUMN     "contestId" INTEGER,
ADD COLUMN     "score" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX "submission_contestId_userId_problemId_idx" ON "submission"("contestId", "userId", "problemId");

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
