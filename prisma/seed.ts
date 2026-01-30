import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

console.log(adapter);

type SeedProblem = {
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  description: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  allowedLanguageIds?: number[];
  participantCount: number;
  successCount: number;
  tags: string[];
  testCases: Array<{
    input: string;
    output: string;
    isSample?: boolean;
  }>;
};

const DEFAULT_ALLOWED_LANGUAGE_IDS = [50, 54, 62, 63];

const seedProblems: SeedProblem[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "EASY",
    description:
      "Given an array of integers and a target value, return the indices of the two numbers that add up to the target.",
    constraints: "2 <= n <= 10^5. Exactly one solution exists.",
    inputFormat: "First line: n and target. Second line: n integers.",
    outputFormat: "Two indices (0-based) in increasing order.",
    participantCount: 120,
    successCount: 98,
    tags: ["Arrays", "Hash Map"],
    testCases: [
      { input: "4 9\n2 7 11 15\n", output: "0 1\n", isSample: true },
      { input: "3 6\n3 2 4\n", output: "1 2\n", isSample: true },
    ],
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "EASY",
    description:
      "Check if a string of brackets is valid. A string is valid if brackets are closed in the correct order.",
    constraints: "1 <= length <= 10^5.",
    inputFormat: "A single line string of brackets.",
    outputFormat: "true if valid, otherwise false.",
    participantCount: 90,
    successCount: 70,
    tags: ["Strings", "Stack"],
    testCases: [
      { input: "()[]{}\n", output: "true\n", isSample: true },
      { input: "(]\n", output: "false\n", isSample: true },
    ],
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "MEDIUM",
    description:
      "Given a list of intervals, merge all overlapping intervals and return the non-overlapping intervals sorted by start.",
    constraints: "1 <= n <= 10^5.",
    inputFormat: "First line: n. Next n lines: start end.",
    outputFormat: "Merged intervals each on a new line.",
    participantCount: 76,
    successCount: 40,
    tags: ["Sorting", "Arrays"],
    testCases: [
      {
        input: "4\n1 3\n2 6\n8 10\n15 18\n",
        output: "1 6\n8 10\n15 18\n",
        isSample: true,
      },
    ],
  },
  {
    slug: "longest-substring-no-repeat",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "MEDIUM",
    description:
      "Find the length of the longest substring without repeating characters.",
    constraints: "1 <= length <= 10^5.",
    inputFormat: "A single line string.",
    outputFormat: "The length of the longest valid substring.",
    participantCount: 64,
    successCount: 35,
    tags: ["Strings", "Sliding Window"],
    testCases: [
      { input: "abcabcbb\n", output: "3\n", isSample: true },
      { input: "bbbbb\n", output: "1\n", isSample: true },
    ],
  },
  {
    slug: "binary-tree-level-order",
    title: "Binary Tree Level Order Traversal",
    difficulty: "MEDIUM",
    description:
      "Return the level order traversal of a binary tree from left to right.",
    constraints: "0 <= n <= 10^5.",
    inputFormat:
      "A single line with level-order nodes, use 'null' for missing children.",
    outputFormat: "Each level as a separate line with node values.",
    participantCount: 58,
    successCount: 29,
    tags: ["Trees", "BFS"],
    testCases: [
      {
        input: "3 9 20 null null 15 7\n",
        output: "3\n9 20\n15 7\n",
        isSample: true,
      },
    ],
  },
  {
    slug: "shortest-path-grid",
    title: "Shortest Path in Grid",
    difficulty: "MEDIUM",
    description:
      "Given a grid of 0s and 1s, find the shortest path from top-left to bottom-right moving in 4 directions.",
    constraints: "1 <= n,m <= 200. 0 = free, 1 = blocked.",
    inputFormat: "n m followed by n lines of m integers.",
    outputFormat: "Minimum steps, or -1 if impossible.",
    participantCount: 43,
    successCount: 18,
    tags: ["Graphs", "BFS"],
    testCases: [
      { input: "3 3\n0 0 0\n1 1 0\n0 0 0\n", output: "4\n", isSample: true },
    ],
  },
  {
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "MEDIUM",
    description:
      "Given coin denominations and a total amount, compute the minimum coins needed to make the amount.",
    constraints: "1 <= amount <= 10^4.",
    inputFormat: "n amount on first line, then n coin values.",
    outputFormat: "Minimum number of coins, or -1 if not possible.",
    participantCount: 67,
    successCount: 24,
    tags: ["Dynamic Programming", "Arrays"],
    testCases: [{ input: "3 11\n1 2 5\n", output: "3\n", isSample: true }],
  },
  {
    slug: "top-k-frequent",
    title: "Top K Frequent Elements",
    difficulty: "MEDIUM",
    description: "Return the k most frequent elements from an integer array.",
    constraints: "1 <= n <= 10^5.",
    inputFormat: "n k on first line, then n integers.",
    outputFormat: "k elements in any order.",
    participantCount: 52,
    successCount: 28,
    tags: ["Arrays", "Hash Map"],
    testCases: [
      { input: "6 2\n1 1 1 2 2 3\n", output: "1 2\n", isSample: true },
    ],
  },
  {
    slug: "matrix-rotation",
    title: "Rotate Matrix",
    difficulty: "HARD",
    description: "Rotate an NxN matrix 90 degrees clockwise in place.",
    constraints: "1 <= n <= 500.",
    inputFormat: "n followed by n lines of n integers.",
    outputFormat: "The rotated matrix.",
    participantCount: 30,
    successCount: 8,
    tags: ["Arrays", "Math"],
    testCases: [
      {
        input: "3\n1 2 3\n4 5 6\n7 8 9\n",
        output: "7 4 1\n8 5 2\n9 6 3\n",
        isSample: true,
      },
    ],
  },
  {
    slug: "minimum-spanning-tree",
    title: "Minimum Spanning Tree",
    difficulty: "HARD",
    description:
      "Given a weighted undirected graph, find the total weight of its minimum spanning tree.",
    constraints: "1 <= n <= 10^5, 0 <= m <= 2*10^5.",
    inputFormat: "n m followed by m lines: u v w.",
    outputFormat: "Total weight of the MST, or -1 if disconnected.",
    participantCount: 22,
    successCount: 5,
    tags: ["Graphs", "Greedy"],
    testCases: [
      {
        input: "4 5\n1 2 1\n1 3 4\n2 3 2\n2 4 7\n3 4 3\n",
        output: "6\n",
        isSample: true,
      },
    ],
  },
];

type SeedContest = {
  slug: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  isPublic?: boolean;
  scoringType: "ACM" | "SCORE";
  freezeAt?: Date;
  problems: Array<{
    slug: string;
    order: number;
    maxScore?: number;
  }>;
};

const seedContests: SeedContest[] = [
  {
    slug: "beginner-contest-1",
    title: "Beginner Contest 1",
    description: "Introduction to basic data structures and algorithms",
    startAt: new Date("2026-02-01T10:00:00Z"),
    endAt: new Date("2026-02-01T12:00:00Z"),
    isPublic: true,
    scoringType: "ACM",
    freezeAt: new Date("2026-02-01T11:50:00Z"),
    problems: [
      { slug: "two-sum", order: 1, maxScore: 100 },
      { slug: "valid-parentheses", order: 2, maxScore: 100 },
      { slug: "merge-intervals", order: 3, maxScore: 150 },
    ],
  },
  {
    slug: "intermediate-contest-1",
    title: "Intermediate Contest 1",
    description: "Advanced algorithms and optimization",
    startAt: new Date("2026-02-08T14:00:00Z"),
    endAt: new Date("2026-02-08T17:00:00Z"),
    isPublic: true,
    scoringType: "SCORE",
    freezeAt: new Date("2026-02-08T16:45:00Z"),
    problems: [
      { slug: "longest-substring-no-repeat", order: 1, maxScore: 200 },
      { slug: "binary-tree-level-order", order: 2, maxScore: 250 },
      { slug: "shortest-path-grid", order: 3, maxScore: 300 },
    ],
  },
  {
    slug: "advanced-contest-1",
    title: "Advanced Contest 1",
    description: "Hard-level problems for experts",
    startAt: new Date("2026-02-15T09:00:00Z"),
    endAt: new Date("2026-02-15T14:00:00Z"),
    isPublic: true,
    scoringType: "ACM",
    freezeAt: new Date("2026-02-15T13:45:00Z"),
    problems: [
      { slug: "coin-change", order: 1, maxScore: 300 },
      { slug: "matrix-rotation", order: 2, maxScore: 350 },
      { slug: "minimum-spanning-tree", order: 3, maxScore: 400 },
    ],
  },
];

const collectTags = (items: SeedProblem[]) => {
  const names = new Set<string>();
  for (const problem of items) {
    for (const tag of problem.tags) {
      names.add(tag);
    }
  }
  return Array.from(names);
};

const ensureTags = async (tagNames: string[]) => {
  for (const name of tagNames) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
};

const seedContestData = async () => {
  for (const contest of seedContests) {
    const existing = await prisma.contest.findUnique({
      where: { slug: contest.slug },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const problemsData = [];
    for (const problemRef of contest.problems) {
      const problem = await prisma.problem.findUnique({
        where: { slug: problemRef.slug },
        select: { id: true },
      });

      if (problem) {
        problemsData.push({
          problemId: problem.id,
          order: problemRef.order,
          maxScore: problemRef.maxScore,
        });
      }
    }

    await prisma.contest.create({
      data: {
        slug: contest.slug,
        title: contest.title,
        description: contest.description,
        startAt: contest.startAt,
        endAt: contest.endAt,
        isPublic: contest.isPublic ?? true,
        scoringType: contest.scoringType,
        freezeAt: contest.freezeAt,
        problems: {
          create: problemsData,
        },
      },
    });
  }
};

const seed = async () => {
  const tagNames = collectTags(seedProblems);
  await ensureTags(tagNames);

  for (const problem of seedProblems) {
    const existing = await prisma.problem.findUnique({
      where: { slug: problem.slug },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const allowedLanguageIds = problem.allowedLanguageIds?.length
      ? Array.from(
          new Set([
            ...problem.allowedLanguageIds,
            ...DEFAULT_ALLOWED_LANGUAGE_IDS,
          ]),
        )
      : DEFAULT_ALLOWED_LANGUAGE_IDS;

    await prisma.problem.create({
      data: {
        slug: problem.slug,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        constraints: problem.constraints,
        inputFormat: problem.inputFormat,
        outputFormat: problem.outputFormat,
        allowedLanguageIds,
        participantCount: problem.participantCount,
        successCount: problem.successCount,
        isPublished: true,
        tags: {
          create: problem.tags.map((tag) => ({
            tag: { connect: { name: tag } },
          })),
        },
        testCases: {
          create: problem.testCases.map((testCase) => ({
            input: testCase.input,
            output: testCase.output,
            isSample: testCase.isSample ?? true,
          })),
        },
      },
    });
  }

  await seedContestData();
};

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
