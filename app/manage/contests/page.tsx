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

const statusOptions = ["Upcoming", "Active", "Ended"] as const
const visibilityOptions = ["Public", "Private"] as const
type ContestStatus = (typeof statusOptions)[number]

type ContestRecord = {
  id: number
  slug: string
  title: string
  description: string | null
  startAt: string
  endAt: string
  freezeAt: string | null
  isPublic: boolean
  scoringType: "SCORE"
  problemCount: number
  participantCount: number
  createdAt: string
  updatedAt: string
  status: ContestStatus
}

type SortKey = "title" | "startAt" | "endAt" | "updatedAt"

type ContestResponse = {
  items: ContestRecord[]
  total: number
  page: number
  pageSize: number
  stats?: {
    public: number
    private: number
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

function statusBadgeClassname(status: ContestStatus) {
  if (status === "Active") return "border-green-400 text-green-500"
  if (status === "Upcoming") return "border-blue-400 text-blue-500"
  return "border-muted-foreground text-muted-foreground"
}

function visibilityBadgeClassname(isPublic: boolean) {
  return isPublic ? "border-green-400 text-green-500" : "border-orange-400 text-orange-500"
}

export default function ManageContestsPage() {
  const [contests, setContests] = useState<ContestRecord[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ public: 0, private: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ContestRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, visibilityFilter, sortKey, sortDirection])

  const fetchContests = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (search.trim()) {
          params.set("search", search.trim())
        }
        if (statusFilter !== "all") {
          params.set("status", statusFilter)
        }
        if (visibilityFilter === "Public") {
          params.set("public", "true")
        }
        if (visibilityFilter === "Private") {
          params.set("public", "false")
        }
        params.set("sort", sortKey)
        params.set("dir", sortDirection)
        params.set("page", String(targetPage))
        params.set("pageSize", String(pageSize))

        const response = await fetch(`/api/manage/contests?${params.toString()}`, { signal })

        if (!response.ok) {
          throw new Error("Failed to load contests.")
        }

        const payload = (await response.json()) as ContestResponse
        setContests(payload.items ?? [])
        setTotal(payload.total ?? 0)
        setStats(payload.stats ?? { public: 0, private: 0 })
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Failed to load contests. Please try again.")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [pageSize, search, sortDirection, sortKey, statusFilter, visibilityFilter]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchContests(page, controller.signal)
    return () => controller.abort()
  }, [fetchContests, page])

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
      const response = await fetch(`/api/manage/contests/${pendingDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to delete contest.")
      }

      setPendingDelete(null)
      setDeleteOpen(false)
      await fetchContests(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contest.")
    } finally {
      setIsDeleting(false)
    }
  }

  function handleResetFilters() {
    setSearch("")
    setStatusFilter("all")
    setVisibilityFilter("all")
  }

  const statsDisplay = useMemo(
    () => ({
      total,
      public: stats.public,
      private: stats.private,
    }),
    [stats.private, stats.public, total]
  )

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar
        items={[
          { label: "Manage" },
          { label: "Contests", href: "/manage/contests" },
        ]}
      />

      <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Administration</p>
            <h1 className="text-2xl font-semibold tracking-tight">Contests</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset filters
            </Button>
            <Button asChild className="gap-2">
              <Link href="/manage/contests/new">
                <FileText className="size-4" />
                New contest
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total contests</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Public</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.public}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Private</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.private}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Contest data table</CardTitle>
              <p className="text-sm text-muted-foreground">
                Search, filter, and manage contest details.
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All visibilities</SelectItem>
                  {visibilityOptions.map((status) => (
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
                    <TableHead className="w-65">
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("title")}
                      >
                        Contest
                        <SortIcon active={sortKey === "title"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Scoring</TableHead>
                    <TableHead>Problems</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("startAt")}
                      >
                        Start
                        <SortIcon active={sortKey === "startAt"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("endAt")}
                      >
                        End
                        <SortIcon active={sortKey === "endAt"} direction={sortDirection} />
                      </button>
                    </TableHead>
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
                      <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                        <div className="flex justify-center items-center w-full">
                          <Spinner />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : contests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                        No contests found. Adjust filters or create a new contest.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contests.map((contest) => (
                      <TableRow key={contest.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{contest.title}</div>
                            <div className="text-xs text-muted-foreground">{contest.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusBadgeClassname(contest.status)} variant="outline">
                            {contest.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={visibilityBadgeClassname(contest.isPublic)} variant="outline">
                            {contest.isPublic ? "Public" : "Private"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                        <Badge variant="secondary">
                          {contest.scoringType}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contest.problemCount}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contest.participantCount}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(contest.startAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(contest.endAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(contest.updatedAt)}
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
                                <Link href={`/manage/contests/${contest.id}`}>Edit</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setPendingDelete(contest)
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
            <AlertDialogTitle>Delete contest</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Delete ${pendingDelete.title}? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete contest"}
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
