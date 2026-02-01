/*
  Warnings:

  - The values [ACM] on the enum `ContestScoringType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContestScoringType_new" AS ENUM ('SCORE');
ALTER TABLE "contest" ALTER COLUMN "scoringType" TYPE "ContestScoringType_new" USING ("scoringType"::text::"ContestScoringType_new");
ALTER TYPE "ContestScoringType" RENAME TO "ContestScoringType_old";
ALTER TYPE "ContestScoringType_new" RENAME TO "ContestScoringType";
DROP TYPE "public"."ContestScoringType_old";
COMMIT;
