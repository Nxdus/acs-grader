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
import { Copy } from "lucide-react"
import { useEffect, useState } from "react"

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
        Record<number, "success" | "fail">
    >({})

    useEffect(() => {
        const handleStart = () => {
            setStatusById({})
        }

        const handleComplete = (
            event: Event,
        ) => {
            const detail = (event as CustomEvent<{
                results?: Array<{ testCaseId: number; passed: boolean }>
            }>).detail

            if (!detail?.results) {
                return
            }

            const next: Record<number, "success" | "fail"> = {}
            for (const result of detail.results) {
                next[result.testCaseId] = result.passed ? "success" : "fail"
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
            <div className="mb-3 text-sm font-medium">Testcases</div>
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
                                        "flex items-center gap-2",
                                        statusById[row.id] ? "justify-between" : "justify-start",
                                    )}
                                >
                                    {statusById[row.id] ? (
                                        <Badge
                                            className={cn(
                                                "text-[11px] font-semibold uppercase tracking-wide",
                                                statusById[row.id] === "success"
                                                    ? "bg-emerald-500/10 text-emerald-600"
                                                    : "bg-rose-500/10 text-rose-600",
                                            )}
                                        >
                                            {statusById[row.id]}
                                        </Badge>
                                    ) : null}
                                    <div className="whitespace-pre-wrap font-mono text-xs">
                                        {row.output}
                                    </div>
                                </div>

                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
