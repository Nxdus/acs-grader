"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  onChangeAction: (rows: EditableTestcaseRow[]) => void
  onAddAction?: () => void
  onGenerateAction?: (count: number) => void
  canGenerate?: boolean
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

export default function TestcaseEditor({
  rows,
  onChangeAction,
  onAddAction,
  onGenerateAction,
  canGenerate = true,
  className,
}: TestcaseEditorProps) {
  const [statusById, setStatusById] = useState<Record<string, RunStatus>>({})
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [generateStep, setGenerateStep] = useState<"confirm" | "count" | "rate-limit">("confirm")
  const [generateCount, setGenerateCount] = useState("5")
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null)
  const [isRateLimitChecking, setIsRateLimitChecking] = useState(false)

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
    onChangeAction(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return
    onChangeAction(rows.filter((row) => row.id !== id))
  }

  async function checkRateLimit() {
    setIsRateLimitChecking(true)
    setRateLimitMessage(null)
    try {
      const response = await fetch("/api/manage/problems/generate-testcases/rate-limit")
      if (response.status === 429) {
        const payload = (await response.json().catch(() => null)) as
          | { retryAfter?: number; resetAt?: string; error?: string }
          | null
        const retryAfter =
          payload?.retryAfter && Number.isFinite(payload.retryAfter)
            ? ` Try again in ${payload.retryAfter} seconds.`
            : ""
        const resetAt = payload?.resetAt
          ? ` Reset at ${new Date(payload.resetAt).toLocaleString()}.`
          : ""
        setRateLimitMessage(
          payload?.error
            ? `${payload.error}${retryAfter}${resetAt}`
            : `OpenRouter rate limit exceeded.${retryAfter}${resetAt}`,
        )
        setGenerateStep("rate-limit")
        return true
      }
      if (!response.ok) {
        setGenerateError("Failed to check rate limit. Please try again.")
        return false
      }
      const payload = (await response.json().catch(() => null)) as { limited?: boolean } | null
      if (payload?.limited) {
        setRateLimitMessage("OpenRouter rate limit exceeded. Please try again later.")
        setGenerateStep("rate-limit")
        return true
      }
      return false
    } catch {
      setGenerateError("Failed to check rate limit. Please try again.")
      return false
    } finally {
      setIsRateLimitChecking(false)
    }
  }

  async function openGenerateDialog() {
    if (!onGenerateAction || !canGenerate) return
    setGenerateStep("confirm")
    setGenerateCount("5")
    setGenerateError(null)
    setRateLimitMessage(null)
    setIsGenerateDialogOpen(true)
    await checkRateLimit()
  }

  function handleGenerateContinue() {
    setGenerateError(null)
    setGenerateStep("count")
  }

  function handleGenerateSubmit() {
    const count = Number(generateCount)
    if (!Number.isFinite(count) || count <= 0) {
      setGenerateError("Please enter a number greater than 0.")
      return
    }
    onGenerateAction?.(Math.floor(count))
    setIsGenerateDialogOpen(false)
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
        {onAddAction ? (
          <div className="flex justify-end gap-2 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openGenerateDialog}
              disabled={!onGenerateAction || !canGenerate}
            >
              Generate testcases
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onAddAction}>
              Add testcase
            </Button>
          </div>
        ) : null}
        <Dialog
          open={isGenerateDialogOpen}
          onOpenChange={(open) => {
            setIsGenerateDialogOpen(open)
            if (!open) {
              setGenerateStep("confirm")
              setGenerateError(null)
              setRateLimitMessage(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Test Cases</DialogTitle>
              <DialogDescription>
                {generateStep === "confirm"
                  ? "Please confirm that all required information has been completed."
                  : generateStep === "count"
                    ? "How many test cases would you like to generate?"
                    : "OpenRouter rate limit detected. Please wait before retrying."}
              </DialogDescription>
            </DialogHeader>
            {generateStep === "count" ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  min={1}
                  value={generateCount}
                  onChange={(event) => setGenerateCount(event.target.value)}
                  placeholder="Number of test cases"
                />
                {generateError ? (
                  <p className="text-sm text-destructive">{generateError}</p>
                ) : null}
              </div>
            ) : generateStep === "rate-limit" ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {rateLimitMessage ?? "OpenRouter rate limit exceeded. Please try again later."}
                </p>
              </div>
            ) : null}
            <DialogFooter>
              {generateStep === "confirm" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsGenerateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleGenerateContinue} disabled={isRateLimitChecking}>
                    {isRateLimitChecking ? "Checking..." : "Confirm"}
                  </Button>
                </>
              ) : generateStep === "count" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setGenerateStep("confirm")}
                  >
                    Back
                  </Button>
                  <Button type="button" onClick={handleGenerateSubmit}>
                    Generate
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsGenerateDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      setGenerateStep("confirm")
                      await checkRateLimit()
                    }}
                    disabled={isRateLimitChecking}
                  >
                    {isRateLimitChecking ? "Checking..." : "Check again"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                      <Textarea
                        value={row.input}
                        onChange={(event) => updateRow(row.id, { input: event.target.value })}
                        placeholder="Input"
                        className="min-h-24 font-mono text-xs"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-2">
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          className="text-destructive size-4"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length <= 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        {statusById[row.id] ? (
                          <Badge
                            className={cn(
                              "text-2xs font-semibold uppercase tracking-wide",
                              statusById[row.id].verdict === "success"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-rose-500/10 text-rose-600",
                            )}
                          >
                            {statusLabel(statusById[row.id].judgeStatus)}
                          </Badge>
                        ) : null}
                      </div>
                      <Textarea
                        value={row.output}
                        onChange={(event) => updateRow(row.id, { output: event.target.value })}
                        placeholder="Output"
                        className="min-h-24 font-mono text-xs"
                      />
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
                            "text-2xs font-semibold uppercase tracking-wide",
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
