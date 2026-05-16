import { CONTEST_SCORE_PER_PASSED_TEST_CASE } from "@/lib/problem-config";

export const computeScore = (
  passedTestCaseCount: number,
) => {
  if (!Number.isFinite(passedTestCaseCount)) return 0;
  return Math.max(0, Math.trunc(passedTestCaseCount) * CONTEST_SCORE_PER_PASSED_TEST_CASE);
};
