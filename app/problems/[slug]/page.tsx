import TextEditor from "@/components/problems/text-editor"
import TaskMarkdown from "@/components/problems/task-markdown"
import TestcaseTable from "@/components/problems/testcase-table"
import { SectionNavBar } from "@/components/sidebar/section-navbar"

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const problemTitle = slug
        .split("-")
        .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
        .join(" ")

    const taskMarkdown = `# ${problemTitle}
    
Write a function that solves the problem described below. Keep the solution efficient.

## Input
- The first line contains an integer \`n\`.
- The second line contains \`n\` integers.

## Output
- Print the correct result for the given input.

## Example
\`\`\`plaintext
5
2 3 5 7 11
\`\`\`

## Notes
- Use an algorithm with acceptable complexity for large \`n\`.
- Handle edge cases such as empty input.
`

    const testcases = [
        {
            input: "5\n2 3 5 7 11",
            output: "28",
        },
        {
            input: "1\n42",
            output: "42",
        },
    ]

    return (
        <main className="w-full h-full flex flex-col rounded-xl bg-background">
            <SectionNavBar
                items={[
                    { label: "Problems", href: "/problems" },
                    {
                        label: problemTitle,
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
                <ResizablePanel maxSize="80%" minSize="20%">
                    <TextEditor />
                </ResizablePanel>
            </ResizablePanelGroup>
        </main>
    )
}
