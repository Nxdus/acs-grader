"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { formatMemoryFromKb } from "@/lib/format-memory"
import { ArrowDown, ArrowUp, ArrowUpDown, Code2, Eraser, Search, Trash2 } from "lucide-react"

const statusOptions = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "TIME_LIMIT_EXCEEDED",
  "RUNTIME_ERROR",
  "COMPILATION_ERROR",
  "MEMORY_LIMIT_EXCEEDED",
  "INTERNAL_ERROR",
  "PENDING",
] as const

type SortKey = "performance" | "createdAt" | "score" | "executionTime" | "memoryUsed" | "status"

type ProblemSummary = {
  id: number
  slug: string
  title: string
}

type SubmissionRecord = {
  id: number
  status: string
  language: string
  languageId: number
  executionTime: number | null
  memoryUsed: number | null
  score: number | null
  contestId: number | null
  createdAt: string
  passedCount: number
  resultCount: number
  user: {
    id: string
    name: string
    email: string
  }
  contest?: {
    id: number
    slug: string
    title: string
  } | null
}

type SubmissionResponse = {
  problem: ProblemSummary
  items: SubmissionRecord[]
  total: number
  page: number
  pageSize: number
  stats?: {
    accepted: number
    attempted: number
  }
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatSeconds(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })}s`
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function statusBadgeClassName(status: string) {
  if (status === "ACCEPTED") return "border-green-400 text-green-500"
  if (status === "PENDING") return "border-blue-400 text-blue-500"
  if (status === "WRONG_ANSWER") return "border-yellow-400 text-yellow-600"
  return "border-red-400 text-red-500"
}

export default function ManageProblemSubmissionsPage() {
  const params = useParams<{ id: string }>()
  const problemId = Number(params.id)

  const [problem, setProblem] = useState<ProblemSummary | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ accepted: 0, attempted: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("performance")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [pendingDelete, setPendingDelete] = useState<SubmissionRecord | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, sortKey, sortDirection])

  const fetchSubmissions = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      if (!Number.isInteger(problemId) || problemId <= 0) {
        setError("Invalid problem id.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const query = new URLSearchParams()
        if (search.trim()) {
          query.set("search", search.trim())
        }
        if (statusFilter !== "all") {
          query.set("status", statusFilter)
        }
        query.set("sort", sortKey)
        query.set("dir", sortDirection)
        query.set("page", String(targetPage))
        query.set("pageSize", String(pageSize))

        const response = await fetch(`/api/manage/problems/${problemId}/submissions?${query.toString()}`, {
          signal,
        })

        if (!response.ok) {
          throw new Error("Failed to load submissions.")
        }

        const payload = (await response.json()) as SubmissionResponse
        setProblem(payload.problem)
        setSubmissions(payload.items ?? [])
        setTotal(payload.total ?? 0)
        setStats(payload.stats ?? { accepted: 0, attempted: 0 })
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Failed to load submissions.")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [pageSize, problemId, search, sortDirection, sortKey, statusFilter]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchSubmissions(page, controller.signal)
    return () => controller.abort()
  }, [fetchSubmissions, page])

  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = total === 0 ? 0 : Math.min(page * pageSize, total)

  const statsDisplay = useMemo(
    () => ({
      total,
      accepted: stats.accepted,
      attempted: stats.attempted,
    }),
    [stats.accepted, stats.attempted, total]
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection(key === "performance" ? "asc" : "desc")
    }
  }

  function handleResetFilters() {
    setSearch("")
    setStatusFilter("all")
    setSortKey("performance")
    setSortDirection("asc")
  }

  async function handleDeleteSubmission() {
    if (!pendingDelete) return

    setIsDeleting(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/manage/problems/${problemId}/submissions/${pendingDelete.id}`,
        { method: "DELETE" },
      )

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to delete submission.")
      }

      setPendingDelete(null)
      setDeleteOpen(false)
      await fetchSubmissions(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete submission.")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleClearSubmissions() {
    setIsClearing(true)
    setError(null)
    try {
      const response = await fetch(`/api/manage/problems/${problemId}/submissions`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to clear submissions.")
      }

      setClearOpen(false)
      setPage(1)
      await fetchSubmissions(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear submissions.")
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar
        items={[
          { label: "Manage" },
          { label: "Problems", href: "/manage/problems" },
          ...(problem
            ? [
                { label: problem.title, href: `/manage/problems/${problem.id}` },
                { label: "Submissions" },
              ]
            : [{ label: "Submissions" }]),
        ]}
      />

      <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {problem ? `${problem.slug} submissions` : "Problem submissions"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {problem ? problem.title : "Submissions"}
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset filters
            </Button>
            <Button
              variant="destructive"
              onClick={() => setClearOpen(true)}
              disabled={isLoading || statsDisplay.attempted === 0 || isClearing}
            >
              <Eraser className="size-4" />
              Clear all
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/manage/problems/${problemId}`}>Edit problem</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Shown submissions</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">All attempts</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.attempted}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Accepted</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.accepted}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Submission table</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ranked by score, execution time, and memory usage by default.
              </p>
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search user or language"
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submission</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("status")}
                      >
                        Status
                        <SortIcon active={sortKey === "status"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("score")}
                      >
                        Score
                        <SortIcon active={sortKey === "score"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("executionTime")}
                      >
                        Time
                        <SortIcon active={sortKey === "executionTime"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("memoryUsed")}
                      >
                        Memory
                        <SortIcon active={sortKey === "memoryUsed"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("createdAt")}
                      >
                        Submitted
                        <SortIcon active={sortKey === "createdAt"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                        <div className="flex justify-center">
                          <Spinner />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                        No submissions found for this problem.
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">#{submission.id}</div>
                            <div className="text-xs text-muted-foreground">{submission.language}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{submission.user.name}</div>
                            <div className="text-xs text-muted-foreground">{submission.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusBadgeClassName(submission.status)} variant="outline">
                            {statusLabel(submission.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {submission.score ?? 0}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatSeconds(submission.executionTime)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatMemoryFromKb(submission.memoryUsed) ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {submission.passedCount}/{submission.resultCount}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(submission.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/manage/problems/${problemId}/submissions/${submission.id}`}>
                                <Code2 className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setPendingDelete(submission)
                                setDeleteOpen(true)
                              }}
                              aria-label={`Delete submission ${submission.id}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Showing {showingFrom}-{showingTo} of {total}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Prev
                </Button>
                <div className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete submission</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Delete submission #${pendingDelete.id}? This will also remove its testcase results.`
                : "This will also remove its testcase results."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteSubmission}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete submission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all submissions</AlertDialogTitle>
            <AlertDialogDescription>
              Delete all submissions for this problem? This will also remove their testcase results and reset problem submission stats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClearOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleClearSubmissions}
              disabled={isClearing}
            >
              {isClearing ? "Clearing..." : "Clear all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) {
    return <ArrowUpDown className="size-4 text-muted-foreground" />
  }
  return direction === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
}
