import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import type { Difficulty, SubmissionStatus } from "@/generated/prisma/client";
import Link from "next/link";

export type ProblemListItem = {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  participantCount: number;
  successCount: number;
  hasSubmission?: boolean;
  submissionStatus?: SubmissionStatus | null;
};

const getDifficultyMeta = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "EASY":
      return { label: "Easy", className: "text-green-400" };
    case "MEDIUM":
      return { label: "Med.", className: "text-yellow-400" };
    case "HARD":
      return { label: "Hard", className: "text-red-400" };
    default:
      return { label: difficulty, className: "text-red-400" };
  }
};

function ProblemItem({
  problem,
  className,
  order,
}: {
  problem: ProblemListItem;
  className?: string;
  order: number;
}) {
  const difficultyMeta = getDifficultyMeta(problem.difficulty);
  const successRate = problem.participantCount
    ? ((problem.successCount / problem.participantCount) * 100).toFixed(2)
    : "0.00";
  const isSolved = problem.submissionStatus === "ACCEPTED";
  const showProgress = typeof problem.hasSubmission === "boolean";

  return (
    <Link href={"/problems/" + problem.slug}>
      <Item className={className} variant={"default"} size={"xs"}>
        <ItemContent className="flex-row justify-between items-center">
          <div className="flex flex-3/4">
            <ItemTitle className="line-clamp-1">
              {order}. {problem.title}
            </ItemTitle>
          </div>

          <div className="flex flex-1">
            <ItemDescription className="text-sm flex w-full items-center justify-between gap-2">
              {showProgress ? (
                <Badge
                  variant="outline"
                  className={
                    isSolved
                      ? "border-emerald-500/40 text-emerald-600"
                      : "border-muted-foreground/40 border-0 text-transparent"
                  }
                >
                  Done
                </Badge>
              ) : null}
              <span>{successRate}%</span>
              <span className={difficultyMeta.className}>
                {difficultyMeta.label}
              </span>
            </ItemDescription>
          </div>
        </ItemContent>
      </Item>
    </Link>
  );
}

export default ProblemItem;
