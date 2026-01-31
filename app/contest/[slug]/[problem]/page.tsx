import TextEditor from "@/components/problems/text-editor"
import TaskMarkdown from "@/components/problems/task-markdown"
import TestcaseTable from "@/components/problems/testcase-table"
import { SectionNavBar } from "@/components/sidebar/section-navbar"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { Contest } from "@/generated/prisma/client"

type ProblemResponse = {
  slug: string
  title: string
  description?: string | null
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

  if (task.constraints) {
    content.push(`## Constraints\n${task.constraints}`)
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
  const headerList = await headers()
  const host = headerList.get("host")
  const protocol = headerList.get("x-forwarded-proto") ?? "http"

  if (!host) {
    return null
  }

  const response = await fetch(`${protocol}://${host}/api/contest/${slug}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

const getTask = async (slug: string, problem: string): Promise<TaskResponse | null> => {
  const headerList = await headers()
  const host = headerList.get("host")
  const protocol = headerList.get("x-forwarded-proto") ?? "http"

  if (!host) {
    return null
  }

  const response = await fetch(`${protocol}://${host}/api/contest/${slug}/problems/${problem}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

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
            contestSlug={slug}
            allowedLanguageIds={task.problem.allowedLanguageIds ?? []}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  )
}
