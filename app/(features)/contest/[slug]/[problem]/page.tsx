import TextEditor from "@/components/problems/text-editor"
import TaskMarkdown from "@/components/problems/task-markdown"
import TestcaseTable from "@/components/problems/testcase-table"
import { SectionNavBar } from "@/components/sidebar/section-navbar"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { formatMemoryLimitFromMb } from "@/lib/format-memory"
import prisma from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { Contest } from "@/generated/prisma/client"

type ProblemResponse = {
  slug: string
  title: string
  description?: string | null
  memoryLimit?: number
  constraints?: string | null
  inputFormat?: string | null
  outputFormat?: string | null
  allowedLanguageIds?: number[]
  testCases?: Array<{
    id: number
    input: string
    output: string
  }>
}

type TaskResponse = {
  contestId: number
  problemId: number
  order: number
  maxScore: number
  allowedLanguageIds?: number[]
  problem: ProblemResponse
}

const buildTaskMarkdown = (task: ProblemResponse, fallbackTitle: string) => {
  const content: string[] = []
  content.push(`# ${task.title || fallbackTitle}`)

  if (task.description) {
    content.push(task.description)
  }

  if (task.constraints || task.memoryLimit) {
    const details: string[] = []
    if (task.constraints) {
      details.push(task.constraints)
    }
    if (task.memoryLimit) {
      details.push(`Memory limit: ${formatMemoryLimitFromMb(task.memoryLimit)}`)
    }
    content.push(`## Constraints\n${details.join("\n")}`)
  }

  if (task.inputFormat) {
    content.push(`## Input\n${task.inputFormat}`)
  }

  if (task.outputFormat) {
    content.push(`## Output\n${task.outputFormat}`)
  }

  return content.filter(Boolean).join("\n\n")
}

const getContest = async (slug: string): Promise<Contest | null> => {
  return prisma.contest.findUnique({
    where: { slug },
  })
}

const getTask = async (slug: string, problem: string): Promise<TaskResponse | null> => {
  const contestProblem = await prisma.contestProblem.findFirst({
    where: {
      contest: {
        slug,
      },
      problem: {
        slug: problem,
        isPublished: true,
      },
    },
    orderBy: { order: "asc" },
    include: {
      problem: {
        include: {
          testCases: {
            where: { isSample: true },
            orderBy: { id: "asc" },
            select: {
              id: true,
              input: true,
              output: true,
            },
          },
        },
      },
    },
  })

  if (!contestProblem) {
    return null
  }

  return {
    contestId: contestProblem.contestId,
    problemId: contestProblem.problemId,
    order: contestProblem.order,
    maxScore: contestProblem.maxScore ?? 0,
    problem: {
      slug: contestProblem.problem.slug,
      title: contestProblem.problem.title,
      description: contestProblem.problem.description,
      memoryLimit: contestProblem.problem.memoryLimit,
      constraints: contestProblem.problem.constraints,
      inputFormat: contestProblem.problem.inputFormat,
      outputFormat: contestProblem.problem.outputFormat,
      allowedLanguageIds: contestProblem.problem.allowedLanguageIds ?? [],
      testCases: contestProblem.problem.testCases,
    },
  }
}

const getContestStatus = (startAt: Date, endAt: Date): "active" | "upcoming" | "ended" => {
  const now = new Date();
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string, problem: string }>,
}) {
  const { slug, problem } = await params;
  const task = await getTask(slug, problem);
  const contestObj = await getContest(slug);

  if (!task || !contestObj) {
    notFound()
  }

  const problemTitle = problem
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ")
  const taskMarkdown = buildTaskMarkdown(task.problem, problemTitle)
  const testcases = (task.problem.testCases ?? []).map((testCase) => ({
    id: testCase.id,
    input: testCase.input,
    output: testCase.output,
  }))

  const contestStatus = getContestStatus(contestObj?.startAt, contestObj?.endAt);

  if (contestStatus !== "active") {
    redirect('/');
  }

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar
        items={[
          { label: "Contest", href: "/contest" },
          { label: contestObj.title, href: "/contest/" + slug },
          {
            label: task.problem.title ?? problemTitle,
            href: "/contest/" + slug + "/" + problem,
          },
        ]}
      />

      <ResizablePanelGroup>
        <ResizablePanel maxSize="80%" minSize="20%">
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel maxSize="80%" minSize="20%">
              <TaskMarkdown content={taskMarkdown} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="30%" maxSize="80%" minSize="20%">
              <TestcaseTable rows={testcases} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel maxSize="80%" minSize="40%">
          <TextEditor
            slug={problem}
            allowedLanguageIds={task.problem.allowedLanguageIds ?? []}
            memoryLimit={task.problem.memoryLimit}
            contestSlug={contestObj.slug}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  )
}
