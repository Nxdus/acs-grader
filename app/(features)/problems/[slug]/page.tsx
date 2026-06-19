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
import { notFound } from "next/navigation"

type TaskResponse = {
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

const buildTaskMarkdown = (task: TaskResponse, fallbackTitle: string) => {
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

const getTask = async (slug: string): Promise<TaskResponse | null> => {
    const safeSlug = slug.trim()

    if (!safeSlug) {
        return null
    }

    const problem = await prisma.problem.findFirst({
        where: {
            OR: [
                isNaN(Number(safeSlug)) ? { slug: safeSlug } : { id: Number(safeSlug) },
            ],
            isPublished: true,
        },
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
    })

    if (!problem) {
        return null
    }

    return {
        slug: problem.slug,
        title: problem.title,
        description: problem.description,
        memoryLimit: problem.memoryLimit,
        constraints: problem.constraints,
        inputFormat: problem.inputFormat,
        outputFormat: problem.outputFormat,
        allowedLanguageIds: problem.allowedLanguageIds ?? [],
        testCases: problem.testCases,
    }
}

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const task = await getTask(slug)

    if (!task) {
        notFound()
    }

    const problemTitle = slug
        .split("-")
        .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
        .join(" ")
    const taskMarkdown = buildTaskMarkdown(task, problemTitle)
    const testcases = (task.testCases ?? []).map((testCase) => ({
        id: testCase.id,
        input: testCase.input,
        output: testCase.output,
    }))

    return (
        <main className="w-full h-full flex flex-col rounded-xl bg-background">
            <SectionNavBar
                items={[
                    { label: "Problems", href: "/problems" },
                    {
                        label: task.title ?? problemTitle,
                        href: "/problems/" + slug,
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
                        slug={slug}
                        allowedLanguageIds={task.allowedLanguageIds ?? []}
                        memoryLimit={task.memoryLimit}
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </main>
    )
}
