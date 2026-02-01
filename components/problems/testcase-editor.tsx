"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ListCheck, Terminal, Trash2 } from "lucide-react"

export type EditableTestcaseRow = {
  id: string
  input: string
  output: string
  isSample: boolean
}

type TestcaseEditorProps = {
  rows: EditableTestcaseRow[]
  onChange: (rows: EditableTestcaseRow[]) => void
  onAdd?: () => void
  className?: string
}

type RunStatus = {
  verdict: "success" | "fail"
  judgeStatus?: string
  output?: string | null
}

function statusLabel(status?: string) {
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

export default function TestcaseEditor({ rows, onChange, onAdd, className }: TestcaseEditorProps) {
  const [statusById, setStatusById] = useState<Record<string, RunStatus>>({})

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

      const next: Record<string, RunStatus> = {}
      for (const result of detail.results) {
        const match = rows.find((row) => Number(row.id) === result.testCaseId)
        if (!match) continue
        next[match.id] = {
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
  }, [rows])

  const rowsWithIndex = useMemo(() => rows.map((row, index) => ({ ...row, index })), [rows])

  function updateRow(id: string, patch: Partial<EditableTestcaseRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return
    onChange(rows.filter((row) => row.id !== id))
  }

  return (
    <div className={cn("h-full w-full overflow-auto bg-background p-6", className)}>
      <Tabs className="gap-0" defaultValue="testcase">
        <TabsList className="p-0 items-end bg-transparent">
          <TabsTrigger
            className="px-4 text-sm font-medium border-0 bg-muted/50 data-active:bg-muted dark:data-active:bg-muted"
            value="testcase"
          >
            <ListCheck className="text-emerald-600" />
            Testcase
          </TabsTrigger>
          <TabsTrigger
            className="px-4 text-sm font-medium border-0 bg-muted/50 data-active:bg-muted dark:data-active:bg-muted"
            value="testresult"
          >
            <Terminal className="text-emerald-600" />
            Test Result
          </TabsTrigger>
        </TabsList>
        {onAdd ? (
          <div className="flex justify-end py-2">
            <Button type="button" variant="outline" size="sm" onClick={onAdd}>
              Add testcase
            </Button>
          </div>
        ) : null}
        <TabsContent value="testcase" className="py-3 px-2 bg-muted">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Input</TableHead>
                <TableHead className="w-1/2">Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsWithIndex.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="align-top">
                    <div className="space-y-2">
                      <Textarea
                        value={row.input}
                        onChange={(event) => updateRow(row.id, { input: event.target.value })}
                        placeholder="Input"
                        className="min-h-24 font-mono text-xs"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Testcase #{row.index + 1}</span>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.isSample}
                            onChange={(event) => updateRow(row.id, { isSample: event.target.checked })}
                          />
                          Sample
                        </label>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-2">
                      <Textarea
                        value={row.output}
                        onChange={(event) => updateRow(row.id, { output: event.target.value })}
                        placeholder="Output"
                        className="min-h-24 font-mono text-xs"
                      />
                      <div className="flex items-center justify-between">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length <= 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
                {rowsWithIndex.map((row) => {
                  const status = statusById[row.id]
                  if (!status) return null
                  return (
                    <div key={row.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-muted-foreground">
                          $ testcase #{row.index + 1}
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
