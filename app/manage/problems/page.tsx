"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Spinner } from "@/components/ui/spinner"

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileText,
  MoreHorizontal,
  Search,
} from "lucide-react"

const difficultyOptions = ["EASY", "MEDIUM", "HARD"] as const
const publishOptions = ["Published", "Draft"] as const

type Difficulty = (typeof difficultyOptions)[number]

type ProblemRecord = {
  id: number
  slug: string
  title: string
  difficulty: Difficulty
  isPublished: boolean
  participantCount: number
  successCount: number
  tags: string[]
  testCaseCount: number
  createdAt: string
  updatedAt: string
}

type SortKey =
  | "title"
  | "difficulty"
  | "participantCount"
  | "successCount"
  | "createdAt"
  | "updatedAt"

type ProblemResponse = {
  items: ProblemRecord[]
  total: number
  page: number
  pageSize: number
  stats?: {
    published: number
    drafts: number
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

const getDifficultyMeta = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "EASY":
      return { label: "Easy", className: "bg-green-500 text-white" };
    case "MEDIUM":
      return { label: "Med.", className: "bg-yellow-500 text-white" };
    case "HARD":
      return { label: "Hard", className: "bg-red-500 text-white" };
    default:
      return { label: difficulty, className: "bg-red-500 text-white" };
  }
};

function statusBadgeClassname(isPublished: boolean) {
  if (isPublished) return "border-green-400 text-green-400";
  return "border-blue-400 text-blue-400";
}

function difficultyBadgeVariant(difficulty: Difficulty) {
  switch (difficulty) {
    case "EASY":
      return "secondary"
    case "MEDIUM":
      return "default"
    default:
      return "outline"
  }
}

export default function ManageProblemsPage() {
  const [problems, setProblems] = useState<ProblemRecord[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ published: 0, drafts: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [publishFilter, setPublishFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ProblemRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [search, difficultyFilter, publishFilter, sortKey, sortDirection])

  const fetchProblems = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (search.trim()) {
          params.set("search", search.trim())
        }
        if (difficultyFilter !== "all") {
          params.set("difficulty", difficultyFilter)
        }
        if (publishFilter === "Published") {
          params.set("published", "true")
        }
        if (publishFilter === "Draft") {
          params.set("published", "false")
        }
        params.set("sort", sortKey)
        params.set("dir", sortDirection)
        params.set("page", String(targetPage))
        params.set("pageSize", String(pageSize))

        const response = await fetch(`/api/manage/problems?${params.toString()}`, { signal })

        if (!response.ok) {
          throw new Error("Failed to load problems.")
        }

        const payload = (await response.json()) as ProblemResponse
        setProblems(payload.items ?? [])
        setTotal(payload.total ?? 0)
        setStats(payload.stats ?? { published: 0, drafts: 0 })
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Failed to load problems. Please try again.")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [difficultyFilter, pageSize, publishFilter, search, sortDirection, sortKey]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchProblems(page, controller.signal)
    return () => controller.abort()
  }, [fetchProblems, page])

  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = total === 0 ? 0 : Math.min(page * pageSize, total)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  async function handleDelete() {
    if (!pendingDelete) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/manage/problems/${pendingDelete.id}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to delete problem.")
      }

      setPendingDelete(null)
      setDeleteOpen(false)
      await fetchProblems(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete problem.")
    } finally {
      setIsDeleting(false)
    }
  }

  function handleResetFilters() {
    setSearch("")
    setDifficultyFilter("all")
    setPublishFilter("all")
  }

  const statsDisplay = useMemo(
    () => ({
      total,
      published: stats.published,
      drafts: stats.drafts,
    }),
    [stats.drafts, stats.published, total]
  )

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar items={
        [
          { label: "Manage" },
          { label: "Problems", href: "/manage/problems" },
        ]
      }
      />

      <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Administration</p>
            <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset filters
            </Button>
            <Button asChild className="gap-2">
              <Link href="/manage/problems/new">
                <FileText className="size-4" />
                New problem
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total problems</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Published</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.published}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Drafts</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.drafts}</CardContent>
          </Card>
        </div>

        <Card className="border">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Problem data table</CardTitle>
              <p className="text-sm text-muted-foreground">
                Search, filter, and manage problem content.
              </p>
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title or slug"
                  className="pl-8"
                />
              </div>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {difficultyOptions.map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={publishFilter} onValueChange={setPublishFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {publishOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
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
                    <TableHead className="w-[260px]">
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("title")}
                      >
                        Problem
                        <SortIcon active={sortKey === "title"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("difficulty")}
                      >
                        Difficulty
                        <SortIcon active={sortKey === "difficulty"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Testcases</TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("updatedAt")}
                      >
                        Updated
                        <SortIcon active={sortKey === "updatedAt"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        <div className="flex justify-center items-center w-full">
                          <Spinner />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : problems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No problems found. Adjust filters or create a new problem.
                      </TableCell>
                    </TableRow>
                  ) : (
                    problems.map((problem) => (
                      <TableRow key={problem.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{problem.title}</div>
                            <div className="text-xs text-muted-foreground">{problem.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDifficultyMeta(problem.difficulty).className} variant={difficultyBadgeVariant(problem.difficulty)}>
                            {getDifficultyMeta(problem.difficulty).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusBadgeClassname(problem.isPublished)} variant="outline">
                            {problem.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {problem.tags.length > 0 ? problem.tags.join(", ") : "�"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {problem.testCaseCount}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(problem.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/manage/problems/${problem.id}`}>Edit</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setPendingDelete(problem)
                                  setDeleteOpen(true)
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
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
            <AlertDialogTitle>Delete problem</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Delete ${pendingDelete.title}? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete problem"}
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
