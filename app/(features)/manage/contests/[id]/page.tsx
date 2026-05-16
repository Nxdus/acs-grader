"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

const visibilityOptions = ["Public", "Private"] as const

type ContestDetail = {
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
}

type ContestProblemRow = {
  problemId: number
  order: number
  maxScore: number | null
  problem: {
    id: number
    slug: string
    title: string
    difficulty: "EASY" | "MEDIUM" | "HARD"
  }
}

type AvailableProblem = {
  id: number
  slug: string
  title: string
  difficulty: "EASY" | "MEDIUM" | "HARD"
}

type FormState = {
  id?: number
  title: string
  slug: string
  description: string
  startAt: string
  endAt: string
  freezeAt: string
  isPublic: boolean
  scoringType: "SCORE"
}

const emptyState = (): FormState => {
  const now = new Date()
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  return {
    title: "",
    slug: "",
    description: "",
    startAt: toInputValue(now),
    endAt: toInputValue(end),
    freezeAt: "",
    isPublic: true,
    scoringType: "SCORE",
  }
}

function toInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function toInputValueFromISO(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return toInputValue(date)
}

function getDateFromInput(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function getTimeFromInput(value: string) {
  if (!value) return "09:00"
  const parts = value.split("T")
  if (parts.length < 2) return "09:00"
  return parts[1].slice(0, 5)
}

function mergeDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map((part) => Number(part))
  const merged = new Date(date)
  if (Number.isFinite(hours) && Number.isFinite(minutes)) {
    merged.setHours(hours, minutes, 0, 0)
  }
  return toInputValue(merged)
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export default function ManageContestEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [state, setState] = useState<FormState>(emptyState())
  const [isSaving, setIsSaving] = useState(false)
  const [isForcing, setIsForcing] = useState<null | "start" | "end" | "freeze">(null)
  const [error, setError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  const [contestProblems, setContestProblems] = useState<ContestProblemRow[]>([])
  const [problemsLoading, setProblemsLoading] = useState(false)
  const [problemsError, setProblemsError] = useState<string | null>(null)

  const [availableProblems, setAvailableProblems] = useState<AvailableProblem[]>([])
  const [availableLoading, setAvailableLoading] = useState(false)
  const [availableError, setAvailableError] = useState<string | null>(null)

  const [newProblemId, setNewProblemId] = useState("")
  const [newProblemOrder, setNewProblemOrder] = useState("")
  const [newProblemScore, setNewProblemScore] = useState("")
  const [isAddingProblem, setIsAddingProblem] = useState(false)

  const contestId = useMemo(() => {
    const raw = params?.id
    if (!raw || raw === "new") return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }, [params?.id])

  const loadContest = useCallback(async (id: number) => {
    setError(null)
    try {
      const response = await fetch(`/api/manage/contests/${id}`)
      if (!response.ok) {
        throw new Error("Failed to load contest.")
      }
      const detail = (await response.json()) as ContestDetail
      setSlugTouched(true)
      setState({
        id: detail.id,
        title: detail.title ?? "",
        slug: detail.slug ?? "",
        description: detail.description ?? "",
        startAt: toInputValueFromISO(detail.startAt),
        endAt: toInputValueFromISO(detail.endAt),
        freezeAt: toInputValueFromISO(detail.freezeAt),
        isPublic: Boolean(detail.isPublic),
        scoringType: "SCORE",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contest.")
    }
  }, [])

  const loadContestProblems = useCallback(async (id: number) => {
    setProblemsLoading(true)
    setProblemsError(null)
    try {
      const response = await fetch(`/api/manage/contests/${id}/problems`)
      if (!response.ok) {
        throw new Error("Failed to load contest problems.")
      }
      const data = (await response.json()) as ContestProblemRow[]
      setContestProblems(Array.isArray(data) ? data : [])
    } catch (err) {
      setProblemsError(err instanceof Error ? err.message : "Failed to load contest problems.")
    } finally {
      setProblemsLoading(false)
    }
  }, [])

  const loadAvailableProblems = useCallback(async () => {
    setAvailableLoading(true)
    setAvailableError(null)
    try {
      const params = new URLSearchParams({
        unassigned: "true",
        pageSize: "200",
        sort: "updatedAt",
        dir: "desc",
      })
      const response = await fetch(`/api/manage/problems?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to load available problems.")
      }
      const data = (await response.json()) as { items?: AvailableProblem[] }
      const items = Array.isArray(data?.items) ? data.items : []
      setAvailableProblems(items)
    } catch (err) {
      setAvailableError(err instanceof Error ? err.message : "Failed to load available problems.")
    } finally {
      setAvailableLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!contestId) {
      setState(emptyState())
      setSlugTouched(false)
      setContestProblems([])
      setProblemsError(null)
      setAvailableProblems([])
      setAvailableError(null)
      return
    }
    void loadContest(contestId)
    void loadContestProblems(contestId)
    void loadAvailableProblems()
  }, [contestId, loadAvailableProblems, loadContest, loadContestProblems])

  function updateState(patch: Partial<FormState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  function handleTitleChange(value: string) {
    setState((prev) => {
      const nextSlug = slugTouched ? prev.slug : slugify(value)
      return { ...prev, title: value, slug: nextSlug }
    })
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    updateState({ slug: value })
  }

  async function handleSave() {
    if (!state.title.trim() || !state.slug.trim()) {
      setError("Title and slug are required.")
      return
    }

    if (!state.startAt || !state.endAt) {
      setError("Start and end time are required.")
      return
    }

    const startAt = new Date(state.startAt)
    const endAt = new Date(state.endAt)
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      setError("Invalid start or end date.")
      return
    }
    if (state.freezeAt) {
      const freezeAtDate = new Date(state.freezeAt)
      if (Number.isNaN(freezeAtDate.getTime())) {
        setError("Invalid freeze date.")
        return
      }
    }

    setIsSaving(true)
    setError(null)

    const payload = {
      title: state.title.trim(),
      slug: state.slug.trim(),
      description: state.description.trim(),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      freezeAt: state.freezeAt ? new Date(state.freezeAt).toISOString() : null,
      isPublic: state.isPublic,
      scoringType: state.scoringType,
    }

    try {
      const response = await fetch(
        state.id ? `/api/manage/contests/${state.id}` : "/api/manage/contests",
        {
          method: state.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to save contest.")
      }

      const saved = (await response.json()) as { id: number }
      if (!state.id) {
        router.replace(`/manage/contests/${saved.id}`)
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contest.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleForceTiming(action: "start" | "end" | "freeze") {
    if (!contestId) return

    const currentStart = new Date(state.startAt)
    const currentEnd = new Date(state.endAt)
    if (Number.isNaN(currentStart.getTime()) || Number.isNaN(currentEnd.getTime())) {
      setError("Invalid contest timing.")
      return
    }
    const durationMs = Math.max(currentEnd.getTime() - currentStart.getTime(), 60 * 60 * 1000)
    const now = new Date()

    let nextStart = currentStart
    let nextEnd = currentEnd
    let nextFreeze: Date | null = state.freezeAt ? new Date(state.freezeAt) : null

    if (action === "start") {
      nextStart = now
      nextEnd = new Date(now.getTime() + durationMs)
      if (nextFreeze && (nextFreeze < nextStart || nextFreeze > nextEnd)) {
        nextFreeze = null
      }
    }

    if (action === "end") {
      nextEnd = now
      nextStart = new Date(now.getTime() - durationMs)
      if (nextFreeze && (nextFreeze < nextStart || nextFreeze > nextEnd)) {
        nextFreeze = null
      }
    }

    if (action === "freeze") {
      nextFreeze = now
      if (nextFreeze < nextStart) {
        nextStart = new Date(nextFreeze.getTime() - 60 * 60 * 1000)
      }
      if (nextFreeze > nextEnd) {
        nextEnd = new Date(nextFreeze.getTime() + 60 * 60 * 1000)
      }
    }

    setIsForcing(action)
    setError(null)

    try {
      const response = await fetch(`/api/manage/contests/${contestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: nextStart.toISOString(),
          endAt: nextEnd.toISOString(),
          freezeAt: nextFreeze ? nextFreeze.toISOString() : null,
        }),
      })

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to update contest timing.")
      }

      setState((prev) => ({
        ...prev,
        startAt: toInputValueFromISO(nextStart.toISOString()),
        endAt: toInputValueFromISO(nextEnd.toISOString()),
        freezeAt: nextFreeze ? toInputValueFromISO(nextFreeze.toISOString()) : "",
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contest timing.")
    } finally {
      setIsForcing(null)
    }
  }

  async function handleAddProblem() {
    if (!contestId) return
    if (!newProblemId.trim()) {
      setProblemsError("Problem is required.")
      return
    }

    setIsAddingProblem(true)
    setProblemsError(null)
    try {
      const response = await fetch(`/api/manage/contests/${contestId}/problems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: Number(newProblemId),
          order: newProblemOrder ? Number(newProblemOrder) : undefined,
          maxScore: newProblemScore ? Number(newProblemScore) : undefined,
        }),
      })

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to add problem.")
      }

      setNewProblemId("")
      setNewProblemOrder("")
      setNewProblemScore("")
      await loadContestProblems(contestId)
      await loadAvailableProblems()
    } catch (err) {
      setProblemsError(err instanceof Error ? err.message : "Failed to add problem.")
    } finally {
      setIsAddingProblem(false)
    }
  }

  async function handleUpdateProblem(problemId: number) {
    if (!contestId) return
    const row = contestProblems.find((problem) => problem.problemId === problemId)
    if (!row) return
    try {
      const response = await fetch(`/api/manage/contests/${contestId}/problems/${problemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: row.order,
          maxScore: row.maxScore,
        }),
      })

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to update problem.")
      }

      await loadContestProblems(contestId)
    } catch (err) {
      setProblemsError(err instanceof Error ? err.message : "Failed to update problem.")
    }
  }

  async function handleRemoveProblem(problemId: number) {
    if (!contestId) return
    try {
      const response = await fetch(`/api/manage/contests/${contestId}/problems/${problemId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to remove problem.")
      }

      await loadContestProblems(contestId)
      await loadAvailableProblems()
    } catch (err) {
      setProblemsError(err instanceof Error ? err.message : "Failed to remove problem.")
    }
  }

  return (
    <main className="w-full h-full flex flex-col bg-background">
      <SectionNavBar
        items={[
          { label: "Manage" },
          { label: "Contests", href: "/manage/contests" },
          { label: state.title || "Editor" },
        ]}
      />

      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="container mx-auto flex flex-col gap-4 overflow-x-auto py-2 px-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-55">
            <p className="text-sm text-muted-foreground">Contest editor</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {state.title || "Untitled contest"}
            </h1>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-2 min-w-45">
                <label className="text-sm font-medium" htmlFor="contest-visibility">
                  Visibility
                </label>
                <Select
                  value={state.isPublic ? "Public" : "Private"}
                  onValueChange={(value) => updateState({ isPublic: value === "Public" })}
                >
                  <SelectTrigger id="contest-visibility" className="w-full">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((visibility) => (
                      <SelectItem key={visibility} value={visibility}>
                        {visibility}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <span className="hidden h-8 w-px bg-border lg:block" />
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push("/manage/contests")}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Spinner /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="container mx-auto flex flex-col gap-6 px-4 pb-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contest details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="contest-title">
                Title
              </label>
              <Input
                id="contest-title"
                value={state.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="Contest name"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="contest-slug">
                Slug
              </label>
              <Input
                id="contest-slug"
                value={state.slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="contest-slug"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="contest-description">
                Description
              </label>
              <Textarea
                id="contest-description"
                value={state.description}
                onChange={(event) => updateState({ description: event.target.value })}
                placeholder="Describe the contest rules, prizes, or special notes."
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="contest-start">
                Start at
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      {getDateFromInput(state.startAt)
                        ? getDateFromInput(state.startAt)!.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={getDateFromInput(state.startAt)}
                      onSelect={(date) => {
                        if (!date) return
                        updateState({ startAt: mergeDateTime(date, getTimeFromInput(state.startAt)) })
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  id="contest-start"
                  type="time"
                  value={getTimeFromInput(state.startAt)}
                  onChange={(event) => {
                    const date = getDateFromInput(state.startAt) ?? new Date()
                    updateState({ startAt: mergeDateTime(date, event.target.value) })
                  }}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="contest-end">
                End at
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      {getDateFromInput(state.endAt)
                        ? getDateFromInput(state.endAt)!.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={getDateFromInput(state.endAt)}
                      onSelect={(date) => {
                        if (!date) return
                        updateState({ endAt: mergeDateTime(date, getTimeFromInput(state.endAt)) })
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  id="contest-end"
                  type="time"
                  value={getTimeFromInput(state.endAt)}
                  onChange={(event) => {
                    const date = getDateFromInput(state.endAt) ?? new Date()
                    updateState({ endAt: mergeDateTime(date, event.target.value) })
                  }}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="contest-freeze">
                Freeze at
              </label>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                        {getDateFromInput(state.freezeAt)
                          ? getDateFromInput(state.freezeAt)!.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          })
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={getDateFromInput(state.freezeAt)}
                        onSelect={(date) => {
                          if (!date) return
                          updateState({ freezeAt: mergeDateTime(date, getTimeFromInput(state.freezeAt)) })
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    id="contest-freeze"
                    type="time"
                    value={getTimeFromInput(state.freezeAt)}
                    onChange={(event) => {
                      const date = getDateFromInput(state.freezeAt) ?? new Date()
                      updateState({ freezeAt: mergeDateTime(date, event.target.value) })
                    }}
                    className="flex-1"
                  />
                </div>

              </div>
            </div>
            <div className="flex items-end flex-wrap gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleForceTiming("start")}
                disabled={!contestId || isSaving || isForcing !== null}
              >
                {isForcing === "start" ? <Spinner /> : "Force Start"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleForceTiming("freeze")}
                disabled={!contestId || isSaving || isForcing !== null}
              >
                {isForcing === "freeze" ? <Spinner /> : "Force Freeze"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleForceTiming("end")}
                disabled={!contestId || isSaving || isForcing !== null}
              >
                {isForcing === "end" ? <Spinner /> : "Force End"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Contest problems</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage problems and scoring order for this contest.
              </p>
            </div>
            {contestId ? (
              <Badge variant="secondary">{contestProblems.length} problems</Badge>
            ) : (
              <Badge variant="outline">Save contest to add problems</Badge>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {contestId ? (
              <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="problem-select">
                    Problem
                  </label>
                  <Select value={newProblemId} onValueChange={setNewProblemId}>
                    <SelectTrigger id="problem-select" className="w-full">
                      <SelectValue
                        placeholder={
                          availableLoading
                            ? "Loading problems..."
                            : availableProblems.length === 0
                              ? "No available problems"
                              : "Select a problem"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableError ? (
                        <SelectItem value="__error__" disabled>
                          {availableError}
                        </SelectItem>
                      ) : availableProblems.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          No available problems
                        </SelectItem>
                      ) : (
                        availableProblems.map((problem) => (
                          <SelectItem key={problem.id} value={String(problem.id)}>
                            {problem.title} ({problem.slug})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="problem-order">
                    Order
                  </label>
                  <Input
                    id="problem-order"
                    type="number"
                    value={newProblemOrder}
                    onChange={(event) => setNewProblemOrder(event.target.value)}
                    placeholder="Auto"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="problem-score">
                    Max score
                  </label>
                  <Input
                    id="problem-score"
                    type="number"
                    value={newProblemScore}
                    onChange={(event) => setNewProblemScore(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <Button
                  onClick={handleAddProblem}
                  disabled={isAddingProblem || availableLoading || !newProblemId}
                >
                  {isAddingProblem ? <Spinner /> : "Add problem"}
                </Button>
              </div>
            ) : null}

            {problemsError ? <p className="text-sm text-destructive">{problemsError}</p> : null}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Problem</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Max score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {problemsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        <Spinner />
                      </TableCell>
                    </TableRow>
                  ) : contestProblems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No problems added to this contest yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contestProblems.map((problem) => (
                      <TableRow key={problem.problemId}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{problem.problem.title}</div>
                            <div className="text-xs text-muted-foreground">{problem.problem.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{problem.problem.difficulty}</Badge>
                        </TableCell>
                        <TableCell className="max-w-30">
                          <Input
                            type="number"
                            value={String(problem.order)}
                            onChange={(event) => {
                              const value = Number(event.target.value)
                              setContestProblems((prev) =>
                                prev.map((item) =>
                                  item.problemId === problem.problemId
                                    ? { ...item, order: Number.isFinite(value) ? value : item.order }
                                    : item
                                )
                              )
                            }}
                          />
                        </TableCell>
                        <TableCell className="max-w-35">
                          <Input
                            type="number"
                            value={problem.maxScore === null ? "" : String(problem.maxScore)}
                            onChange={(event) => {
                              const value = event.target.value
                              const numeric = Number(value)
                              setContestProblems((prev) =>
                                prev.map((item) =>
                                  item.problemId === problem.problemId
                                    ? {
                                      ...item,
                                      maxScore:
                                        value.trim() === ""
                                          ? null
                                          : Number.isFinite(numeric)
                                            ? numeric
                                            : item.maxScore,
                                    }
                                    : item
                                )
                              )
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/manage/problems/${problem.problemId}`}>Edit</Link>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleUpdateProblem(problem.problemId)}>
                              Save
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveProblem(problem.problemId)}
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
