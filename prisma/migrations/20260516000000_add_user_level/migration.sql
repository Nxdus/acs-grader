-- CreateEnum
CREATE TYPE "UserLevel" AS ENUM ('BEGINNER', 'ADVANCED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "level" "UserLevel" NOT NULL DEFAULT 'BEGINNER';
