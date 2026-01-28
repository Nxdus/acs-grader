"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ListCheck, Terminal } from "lucide-react"
import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"

export interface TestcaseRow {
    id: number
    input: string
    output: string
}

interface TestcaseTableProps {
    rows: TestcaseRow[]
    className?: string
}

export default function TestcaseTable({ rows, className }: TestcaseTableProps) {
    const [statusById, setStatusById] = useState<
        Record<
            number,
            { verdict: "success" | "fail"; judgeStatus?: string; output?: string | null }
        >
    >({})

    const statusLabel = (status?: string) => {
        console.log(status)
        switch (status) {
            case "ACCEPTED":
                return "Accepted"
            case "WRONG_ANSWER":
                return "Wrong Answer"
            case "TIME_LIMIT_EXCEEDED":
                return "Time Limit"
            case "RUNTIME_ERROR":
                return "Runtime Error"
            case "COMPILATION_ERROR":
                return "Compilation Error"
            case "INTERNAL_ERROR":
                return "Internal Error"
            case "EXEC_FORMAT_ERROR":
                return "Exec Format Error"
            case "MEMORY_LIMIT_EXCEEDED":
                return "Memory Limit"
            case "OUTPUT_LIMIT_EXCEEDED":
                return "Output Limit"
            case "STORAGE_LIMIT_EXCEEDED":
                return "Storage Limit"
            case "PENDING":
                return "Pending"
            default:
                return "Unknown"
        }
    }

    useEffect(() => {
        const handleStart = () => {
            setStatusById({})
        }

        const handleComplete = (event: Event) => {
            const detail = (event as CustomEvent<{
                results?: Array<{
                    testCaseId: number
                    passed: boolean
                    judgeStatus?: string
                    actualOutput?: string | null
                }>
            }>).detail

            if (!detail?.results) {
                return
            }

            const next: Record<number, { verdict: "success" | "fail"; judgeStatus?: string; output?: string | null }> = {}
            for (const result of detail.results) {
                next[result.testCaseId] = {
                    verdict: result.passed ? "success" : "fail",
                    judgeStatus: result.judgeStatus,
                    output: result.actualOutput ?? null,
                }
            }
            setStatusById(next)
        }

        window.addEventListener("testcase-run-start", handleStart)
        window.addEventListener("testcase-run-complete", handleComplete)

        return () => {
            window.removeEventListener("testcase-run-start", handleStart)
            window.removeEventListener("testcase-run-complete", handleComplete)
        }
    }, [])

    const handleCopy = async (value: string) => {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(value)
            return
        }

        const textarea = document.createElement("textarea")
        textarea.value = value
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
    }

    return (
        <div className={cn("h-full w-full overflow-auto bg-background p-6", className)}>
            <Tabs className="gap-0" defaultValue="testcase">
                <TabsList className="p-0 items-end bg-transparent">
                    <TabsTrigger className="px-4 text-sm font-medium border-0 bg-muted/50 data-active:bg-muted dark:data-active:bg-muted" value="testcase">
                        <ListCheck className="text-emerald-600" />
                        Testcase
                    </TabsTrigger>
                    <TabsTrigger className="px-4 text-sm font-medium border-0 bg-muted/50 data-active:bg-muted dark:data-active:bg-muted" value="testresult">
                        <Terminal className="text-emerald-600" />
                        Test Result
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="testcase" className="py-3 px-2 bg-muted">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/2">Input</TableHead>
                                <TableHead className="w-1/2">Output</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="align-middle">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="whitespace-pre-wrap font-mono text-xs">
                                                {row.input}
                                            </div>
                                            <Button
                                                type="button"
                                                size="icon-xs"
                                                variant="ghost"
                                                onClick={() => handleCopy(row.input)}
                                            >
                                                <Copy />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div
                                            className={cn(
                                                "flex items-start gap-2",
                                                statusById[row.id] ? "justify-between" : "justify-start",
                                            )}
                                        >
                                            <div className="whitespace-pre-wrap font-mono text-xs">
                                                {row.output}
                                            </div>
                                            {statusById[row.id] ? (
                                                <Badge
                                                    className={cn(
                                                        "text-[11px] font-semibold uppercase tracking-wide",
                                                        statusById[row.id].verdict === "success"
                                                            ? "bg-emerald-500/10 text-emerald-600"
                                                            : "bg-rose-500/10 text-rose-600",
                                                    )}
                                                >
                                                    {statusLabel(statusById[row.id].judgeStatus)}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="testresult" className="bg-muted">
                    <div className="p-4 font-mono text-xs">
                        {Object.keys(statusById).length === 0 ? (
                            <div>No results yet.</div>
                        ) : (
                            <div className="space-y-3">
                                {rows.map((row) => {
                                    const status = statusById[row.id]
                                    if (!status) return null
                                    return (
                                        <div key={row.id}>
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    $ testcase #{row.id}
                                                </span>
                                                <Badge
                                                    className={cn(
                                                        "text-[11px] font-semibold uppercase tracking-wide",
                                                        status.verdict === "success"
                                                            ? "bg-emerald-500/10 text-emerald-600"
                                                            : "bg-rose-500/10 text-rose-600",
                                                    )}
                                                >
                                                    {statusLabel(status.judgeStatus)}
                                                </Badge>
                                            </div>
                                            <div className="whitespace-pre-wrap wrap-break-words">
                                                {status.output || "(no output)"}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
