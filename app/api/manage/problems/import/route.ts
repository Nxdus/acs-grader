import { NextResponse } from "next/server"
import { Difficulty, UserLevel } from "@/generated/prisma/client"
import { FIXED_TEST_CASE_COUNT } from "@/lib/problem-config"
import prisma from "@/lib/prisma"

type ImportedTestcaseFile = {
  version?: unknown
  testCases?: unknown
}

type ImportedProblemFile = {
  version?: unknown
  problems?: unknown
}

type NormalizedTestCase = {
  input: string
  output: string
  isSample: boolean
}

type NormalizedProblem = {
  title: string
  slug: string
  level: UserLevel
  difficulty: Difficulty
  description: string
  memoryLimit: number
  constraints: string
  inputFormat: string
  outputFormat: string
  allowedLanguageIds: number[]
  isPublished: boolean
  tags: string[]
  contestId: number | null
  testCases: NormalizedTestCase[]
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function normalizeSlug(value: unknown) {
  return normalizeString(value).toLowerCase()
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return []
  const unique = new Set<string>()

  for (const entry of value) {
    if (typeof entry !== "string") continue
    const trimmed = entry.trim()
    if (!trimmed) continue
    unique.add(trimmed)
  }

  return Array.from(unique)
}

function normalizeAllowedLanguages(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.trunc(entry))
}

function normalizeMemoryLimit(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const normalized = Math.trunc(parsed)
  if (normalized <= 0) return null
  return normalized
}

function normalizeContestId(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.trunc(parsed)
}

function normalizeTestCases(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const input = normalizeString((entry as { input?: unknown }).input)
      const output = normalizeString((entry as { output?: unknown }).output)
      const isSample =
        typeof (entry as { isSample?: unknown }).isSample === "boolean"
          ? (entry as { isSample?: boolean }).isSample
          : false
      if (!input || !output) return null
      return { input, output, isSample }
    })
    .filter((entry): entry is NormalizedTestCase => Boolean(entry))
}

function buildTestcaseTemplate() {
  return {
    version: 1,
    testCases: Array.from({ length: FIXED_TEST_CASE_COUNT }, (_, index) => ({
      input: `2 ${index + 1}\n0 ${index + 1}\n`,
      output: "0 1\n",
      isSample: index < 2,
    })),
  }
}

function buildProblemTemplate() {
  return {
    version: 1,
    problems: [
      {
        title: "Two Sums",
        slug: "two-sums",
        level: "BEGINNER",
        difficulty: "EASY",
        isPublished: false,
        memoryLimit: 256,
        description: "Given two integers, print their sum.",
        constraints: "0 <= a, b <= 10^9",
        inputFormat: "Two integers a and b.",
        outputFormat: "Print the sum of a and b.",
        allowedLanguageIds: [71, 63],
        tags: ["math", "implementation"],
        contestId: null,
        testCases: Array.from({ length: FIXED_TEST_CASE_COUNT }, (_, index) => ({
          input: `${index}\n${index + 1}\n`,
          output: `${index + index + 1}\n`,
          isSample: index < 2,
        })),
      },
    ],
  }
}

function buildProblemPayload(entry: unknown) {
  if (!entry || typeof entry !== "object") {
    return { error: "Each problem entry must be an object." } as const
  }

  const title = normalizeString((entry as { title?: unknown }).title)
  const slug = normalizeSlug((entry as { slug?: unknown }).slug)
  const levelValue = (entry as { level?: unknown }).level
  const difficultyValue = (entry as { difficulty?: unknown }).difficulty
  const level = Object.values(UserLevel).includes(levelValue as UserLevel)
    ? (levelValue as UserLevel)
    : UserLevel.BEGINNER
  const difficulty = Object.values(Difficulty).includes(difficultyValue as Difficulty)
    ? (difficultyValue as Difficulty)
    : null
  const memoryLimit = normalizeMemoryLimit((entry as { memoryLimit?: unknown }).memoryLimit)
  const description = normalizeString((entry as { description?: unknown }).description)
  const constraints = normalizeString((entry as { constraints?: unknown }).constraints)
  const inputFormat = normalizeString((entry as { inputFormat?: unknown }).inputFormat)
  const outputFormat = normalizeString((entry as { outputFormat?: unknown }).outputFormat)
  const allowedLanguageIds = normalizeAllowedLanguages(
    (entry as { allowedLanguageIds?: unknown }).allowedLanguageIds,
  )
  const isPublished =
    typeof (entry as { isPublished?: unknown }).isPublished === "boolean"
      ? Boolean((entry as { isPublished?: boolean }).isPublished)
      : true
  const tags = normalizeTags((entry as { tags?: unknown }).tags)
  const contestId = normalizeContestId((entry as { contestId?: unknown }).contestId)
  const testCases = normalizeTestCases((entry as { testCases?: unknown }).testCases)

  if (!title || !slug) {
    return { error: "Each problem must include title and slug." } as const
  }

  if (!difficulty) {
    return { error: `Problem "${slug}" has invalid difficulty.` } as const
  }

  if (memoryLimit === null) {
    return { error: `Problem "${slug}" has invalid memoryLimit.` } as const
  }

  if (testCases.length !== FIXED_TEST_CASE_COUNT) {
    return {
      error: `Problem "${slug}" must contain exactly ${FIXED_TEST_CASE_COUNT} valid test cases.`,
    } as const
  }

  return {
    value: {
      title,
      slug,
      level,
      difficulty,
      description,
      memoryLimit,
      constraints,
      inputFormat,
      outputFormat,
      allowedLanguageIds,
      isPublished,
      tags,
      contestId,
      testCases,
    } satisfies NormalizedProblem,
  } as const
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  if (type === "testcases") {
    const body = JSON.stringify(buildTestcaseTemplate(), null, 2)
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="testcase-import-template.json"',
      },
    })
  }

  const body = JSON.stringify(buildProblemTemplate(), null, 2)
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="problem-import-template.json"',
    },
  })
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Import file is required." }, { status: 400 })
    }

    const text = await file.text()
    let parsed: ImportedTestcaseFile | ImportedProblemFile
    try {
      parsed = JSON.parse(text) as ImportedTestcaseFile | ImportedProblemFile
    } catch {
      return NextResponse.json({ error: "Uploaded file is not valid JSON." }, { status: 400 })
    }

    if (Number(parsed?.version) !== 1) {
      return NextResponse.json({ error: "Unsupported import file version." }, { status: 400 })
    }

    if (Array.isArray((parsed as ImportedProblemFile).problems)) {
      const normalizedProblems = []
      for (const entry of (parsed as ImportedProblemFile).problems ?? []) {
        const result = buildProblemPayload(entry)
        if ("error" in result) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        normalizedProblems.push(result.value)
      }

      if (normalizedProblems.length === 0) {
        return NextResponse.json({ error: "Import file must contain at least one problem." }, { status: 400 })
      }

      const duplicateSlugs = normalizedProblems
        .map((problem) => problem.slug)
        .filter((slug, index, all) => all.indexOf(slug) !== index)

      if (duplicateSlugs.length > 0) {
        return NextResponse.json(
          { error: `Duplicate slugs found in import file: ${Array.from(new Set(duplicateSlugs)).join(", ")}` },
          { status: 400 },
        )
      }

      const contestIds = Array.from(
        new Set(
          normalizedProblems
            .map((problem) => problem.contestId)
            .filter((contestId): contestId is number => contestId !== null),
        ),
      )

      const existingProblems = await prisma.problem.findMany({
        where: { slug: { in: normalizedProblems.map((problem) => problem.slug) } },
        select: { slug: true },
      })

      if (existingProblems.length > 0) {
        return NextResponse.json(
          {
            error: `Some slugs already exist: ${existingProblems.map((problem) => problem.slug).join(", ")}`,
          },
          { status: 409 },
        )
      }

      const contests = contestIds.length
        ? await prisma.contest.findMany({
            where: { id: { in: contestIds } },
            select: { id: true, level: true },
          })
        : []

      const contestMap = new Map(contests.map((contest) => [contest.id, contest]))
      for (const problem of normalizedProblems) {
        if (problem.contestId === null) continue
        const contest = contestMap.get(problem.contestId)
        if (!contest) {
          return NextResponse.json(
            { error: `Contest ${problem.contestId} was not found for problem "${problem.slug}".` },
            { status: 404 },
          )
        }
        if (contest.level !== problem.level) {
          return NextResponse.json(
            { error: `Problem "${problem.slug}" level must match contest level.` },
            { status: 400 },
          )
        }
      }

      const created = await prisma.$transaction(async (tx) => {
        const createdProblems: Array<{ id: number; slug: string; title: string }> = []

        for (const problem of normalizedProblems) {
          const createdProblem = await tx.problem.create({
            data: {
              slug: problem.slug,
              title: problem.title,
              level: problem.level,
              difficulty: problem.difficulty,
              description: problem.description,
              memoryLimit: problem.memoryLimit,
              constraints: problem.constraints,
              inputFormat: problem.inputFormat,
              outputFormat: problem.outputFormat,
              allowedLanguageIds: problem.allowedLanguageIds,
              isPublished: problem.isPublished,
              tags: {
                create: problem.tags.map((name) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name },
                      create: { name },
                    },
                  },
                })),
              },
              testCases: {
                create: problem.testCases.map((testCase) => ({
                  input: testCase.input,
                  output: testCase.output,
                  isSample: testCase.isSample,
                })),
              },
            },
            select: { id: true, slug: true, title: true },
          })

          if (problem.contestId !== null) {
            const maxOrder = await tx.contestProblem.aggregate({
              where: { contestId: problem.contestId },
              _max: { order: true },
            })

            await tx.contestProblem.create({
              data: {
                contestId: problem.contestId,
                problemId: createdProblem.id,
                order: (maxOrder._max.order ?? 0) + 1,
              },
            })
          }

          createdProblems.push(createdProblem)
        }

        return createdProblems
      })

      return NextResponse.json({ createdCount: created.length, items: created }, { status: 201 })
    }

    const testCases = normalizeTestCases((parsed as ImportedTestcaseFile).testCases)

    if (testCases.length !== FIXED_TEST_CASE_COUNT) {
      return NextResponse.json(
        { error: `Import file must contain exactly ${FIXED_TEST_CASE_COUNT} valid test cases.` },
        { status: 400 },
      )
    }

    return NextResponse.json({ testCases })
  } catch (error) {
    console.error("Failed to import problems:", error)
    return NextResponse.json({ error: "Failed to import file." }, { status: 500 })
  }
}
