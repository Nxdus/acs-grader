"use client"

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import TaskMarkdownEditor from "@/components/problems/task-markdown-editor"
import TestcaseEditor, { type EditableTestcaseRow } from "@/components/problems/testcase-editor"
import TextEditor from "@/components/problems/text-editor"
import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { formatMemoryLimitFromMb } from "@/lib/format-memory"
import { FIXED_TEST_CASE_COUNT } from "@/lib/problem-config"
import { ChevronDown, FileUp } from "lucide-react"

const difficultyOptions = ["EASY", "MEDIUM", "HARD"] as const
const levelOptions = ["BEGINNER", "ADVANCED"] as const

type Difficulty = (typeof difficultyOptions)[number]
type UserLevel = (typeof levelOptions)[number]

type ProblemDetail = {
  id: number
  slug: string
  title: string
  description: string | null
  level: UserLevel
  difficulty: Difficulty
  memoryLimit: number
  constraints: string | null
  inputFormat: string | null
  outputFormat: string | null
  allowedLanguageIds: number[]
  isPublished: boolean
  tags: string[]
  contestId?: number | null
  testCases: Array<{ id: number; input: string; output: string; isSample: boolean }>
}

type JudgeLanguage = {
  id: number
  name: string
}

type TagOption = {
  id: number
  name: string
}

type ContestOption = {
  id: number
  title: string
  level: UserLevel
}

type FormState = {
  id?: number
  title: string
  slug: string
  level: UserLevel
  difficulty: Difficulty
  isPublished: boolean
  contestId: string
  description: string
  memoryLimit: string
  constraints: string
  inputFormat: string
  outputFormat: string
  allowedLanguageIds: string
  tags: string
  testCases: EditableTestcaseRow[]
}

const emptyTestcase = (): EditableTestcaseRow => ({
  id: crypto.randomUUID(),
  input: "",
  output: "",
  isSample: false,
})

function buildFixedTestCases(testCases: EditableTestcaseRow[] = []) {
  const normalized = testCases.slice(0, FIXED_TEST_CASE_COUNT)
  while (normalized.length < FIXED_TEST_CASE_COUNT) {
    normalized.push(emptyTestcase())
  }
  return normalized
}

function createEmptyState(): FormState {
  return {
    title: "",
    slug: "",
    level: levelOptions[0],
    difficulty: difficultyOptions[0],
    isPublished: true,
    contestId: "",
    description: "",
    memoryLimit: "256",
    constraints: "",
    inputFormat: "",
    outputFormat: "",
    allowedLanguageIds: "",
    tags: "",
    testCases: buildFixedTestCases(),
  }
}

function buildTaskMarkdown(state: FormState) {
  const content: string[] = []
  content.push(`# ${state.title || "Untitled Problem"}`)

  if (state.description) {
    content.push(state.description)
  }

  if (state.constraints || state.memoryLimit.trim()) {
    const details = []
    if (state.constraints) {
      details.push(state.constraints)
    }
    if (state.memoryLimit.trim()) {
      details.push(
        `Memory limit: ${formatMemoryLimitFromMb(Number(state.memoryLimit.trim())) ?? state.memoryLimit.trim() + " MB"}`
      )
    }
    content.push(`## Constraints\n${details.join("\n")}`)
  }

  if (state.inputFormat) {
    content.push(`## Input\n${state.inputFormat}`)
  }

  if (state.outputFormat) {
    content.push(`## Output\n${state.outputFormat}`)
  }

  return content.filter(Boolean).join("\n\n")
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseAllowedLanguageIds(value: string) {
  return parseCsv(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .map((item) => Math.trunc(item))
}

export default function ManageProblemEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const [state, setState] = useState<FormState>(createEmptyState())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [languageOptions, setLanguageOptions] = useState<JudgeLanguage[]>([])
  const [languageLoading, setLanguageLoading] = useState(false)
  const [languageError, setLanguageError] = useState<string | null>(null)
  const [tagOptions, setTagOptions] = useState<TagOption[]>([])
  const [tagLoading, setTagLoading] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)
  const [contestOptions, setContestOptions] = useState<ContestOption[]>([])
  const [contestLoading, setContestLoading] = useState(false)
  const [contestError, setContestError] = useState<string | null>(null)

  const previewContent = useMemo(() => buildTaskMarkdown(state), [state])
  const canGenerateTestcases = useMemo(
    () =>
      Boolean(
        state.description.trim() &&
        state.constraints.trim() &&
        state.inputFormat.trim() &&
        state.outputFormat.trim()
      ) && !isGenerating,
    [
      state.description,
      state.constraints,
      state.inputFormat,
      state.outputFormat,
      isGenerating,
    ]
  )
  const selectedLanguageIds = useMemo(
    () => parseAllowedLanguageIds(state.allowedLanguageIds),
    [state.allowedLanguageIds]
  )
  const selectedLanguageNames = useMemo(() => {
    if (!languageOptions.length || selectedLanguageIds.length === 0) return []
    const map = new Map(languageOptions.map((lang) => [lang.id, lang.name]))
    return selectedLanguageIds.map((id) => map.get(id)).filter(Boolean) as string[]
  }, [languageOptions, selectedLanguageIds])
  const selectedTags = useMemo(() => parseCsv(state.tags), [state.tags])

  const loadProblem = useCallback(async (id: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/manage/problems/${id}`)
      if (!response.ok) {
        throw new Error("Failed to load problem details.")
      }
      const detail = (await response.json()) as ProblemDetail
      setSlugTouched(true)
      setState({
        id: detail.id,
        title: detail.title ?? "",
        slug: detail.slug ?? "",
        level: detail.level ?? levelOptions[0],
        difficulty: detail.difficulty ?? difficultyOptions[0],
        isPublished: Boolean(detail.isPublished),
        contestId: detail.contestId ? String(detail.contestId) : "",
        description: detail.description ?? "",
        memoryLimit: String(detail.memoryLimit ?? 256),
        constraints: detail.constraints ?? "",
        inputFormat: detail.inputFormat ?? "",
        outputFormat: detail.outputFormat ?? "",
        allowedLanguageIds: (detail.allowedLanguageIds ?? []).join(", "),
        tags: (detail.tags ?? []).join(", "),
        testCases:
          detail.testCases.length > 0
            ? buildFixedTestCases(detail.testCases.map((testCase) => ({
              id: String(testCase.id),
              input: testCase.input,
              output: testCase.output,
              isSample: testCase.isSample,
            })))
            : buildFixedTestCases(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load problem.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadLanguages() {
      setLanguageLoading(true)
      setLanguageError(null)
      try {
        const response = await fetch("https://judge.nxdus.space/languages", {
          headers: { "X-Judge0-Token": "paitongacs23kodlor" },
        })
        if (!response.ok) {
          throw new Error(`Failed to load languages: ${response.status}`)
        }
        const data = (await response.json()) as JudgeLanguage[]
        if (cancelled) return
        setLanguageOptions(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          setLanguageError(err instanceof Error ? err.message : "Failed to load languages.")
        }
      } finally {
        if (!cancelled) {
          setLanguageLoading(false)
        }
      }
    }
    loadLanguages()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadTags() {
      setTagLoading(true)
      setTagError(null)
      try {
        const response = await fetch("/api/tags")
        if (!response.ok) {
          throw new Error(`Failed to load tags: ${response.status}`)
        }
        const data = (await response.json()) as TagOption[]
        if (cancelled) return
        setTagOptions(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          setTagError(err instanceof Error ? err.message : "Failed to load tags.")
        }
      } finally {
        if (!cancelled) {
          setTagLoading(false)
        }
      }
    }
    loadTags()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadContests() {
      setContestLoading(true)
      setContestError(null)
      try {
        const params = new URLSearchParams({
          pageSize: "200",
          sort: "title",
          dir: "asc",
          level: state.level,
        })
        const response = await fetch(`/api/manage/contests?${params.toString()}`)
        if (!response.ok) {
          throw new Error(`Failed to load contests: ${response.status}`)
        }
        const data = (await response.json()) as { items?: ContestOption[] }
        if (cancelled) return
        setContestOptions(Array.isArray(data?.items) ? data.items : [])
      } catch (err) {
        if (!cancelled) {
          setContestError(err instanceof Error ? err.message : "Failed to load contests.")
        }
      } finally {
        if (!cancelled) {
          setContestLoading(false)
        }
      }
    }
    loadContests()
    return () => {
      cancelled = true
    }
  }, [state.level])

  useEffect(() => {
    const rawId = params?.id
    if (!rawId || rawId === "new") {
      setState(createEmptyState())
      setSlugTouched(false)
      return
    }
    const id = Number(rawId)
    if (Number.isFinite(id)) {
      void loadProblem(id)
    }
  }, [loadProblem, params?.id])

  function updateState(patch: Partial<FormState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/manage/problems/import", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { testCases?: Array<{ input?: string; output?: string; isSample?: boolean }>; error?: string }
        | null

      if (!response.ok || !Array.isArray(payload?.testCases)) {
        throw new Error(payload?.error ?? "Failed to import testcases.")
      }

      const importedTestCases = payload.testCases

      setState((prev) => ({
        ...prev,
        testCases: buildFixedTestCases(
          importedTestCases.map((testCase) => ({
            id: crypto.randomUUID(),
            input: String(testCase.input ?? ""),
            output: String(testCase.output ?? ""),
            isSample: Boolean(testCase.isSample),
          })),
        ),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import file.")
    } finally {
      setIsImporting(false)
    }
  }

  function handleTitleChange(value: string) {
    setState((prev) => {
      const nextSlug = slugTouched ? prev.slug : slugify(value)
      return { ...prev, title: value, slug: nextSlug }
    })
  }

  function updateAllowedLanguageIds(next: number[]) {
    const unique = Array.from(new Set(next)).sort((a, b) => a - b)
    updateState({ allowedLanguageIds: unique.join(", ") })
  }

  function toggleLanguage(id: number) {
    if (selectedLanguageIds.includes(id)) {
      updateAllowedLanguageIds(selectedLanguageIds.filter((item) => item !== id))
    } else {
      updateAllowedLanguageIds([...selectedLanguageIds, id])
    }
  }

  function updateTags(next: string[]) {
    const unique = Array.from(new Set(next)).filter(Boolean)
    updateState({ tags: unique.join(", ") })
  }

  function toggleTag(name: string) {
    if (selectedTags.includes(name)) {
      updateTags(selectedTags.filter((item) => item !== name))
    } else {
      updateTags([...selectedTags, name])
    }
  }

  async function handleGenerateTestcases(count: number) {
    if (!Number.isFinite(count) || count <= 0) return
    const remainingSlots = Math.max(0, FIXED_TEST_CASE_COUNT - state.testCases.filter(
      (testCase) => testCase.input.trim() && testCase.output.trim()
    ).length)
    const amount = Math.min(Math.floor(count), remainingSlots)
    if (amount <= 0) {
      setError(`This problem already has ${FIXED_TEST_CASE_COUNT} test cases.`)
      return
    }
    if (!state.description.trim() ||
      !state.constraints.trim() ||
      !state.inputFormat.trim() ||
      !state.outputFormat.trim()) {
      setError("Please complete description, constraints, input, and output first.")
      return
    }
    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/manage/problems/generate-testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: state.description,
          constraints: state.constraints,
          inputFormat: state.inputFormat,
          outputFormat: state.outputFormat,
          count: amount,
          existingTestCases: state.testCases.map((testCase) => ({
            input: testCase.input,
            output: testCase.output,
            isSample: testCase.isSample,
          })),
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { testCases?: Array<{ input?: string; output?: string; isSample?: boolean }> }
        | { error?: string }
        | null

      if (!response.ok) {
        const message =
          payload && "error" in payload && payload.error
            ? payload.error
            : "Failed to generate test cases."
        throw new Error(message)
      }

      const generated =
        payload && "testCases" in payload && Array.isArray(payload.testCases)
          ? payload.testCases
          : []
      if (generated.length === 0) {
        throw new Error("No test cases were generated.")
      }

      setState((prev) => ({
        ...prev,
        testCases: buildFixedTestCases([
          ...prev.testCases.filter((testCase) => testCase.input.trim() && testCase.output.trim()),
          ...generated.map((testCase) => ({
            id: crypto.randomUUID(),
            input: String(testCase.input ?? ""),
            output: String(testCase.output ?? ""),
            isSample: Boolean(testCase.isSample),
          })),
        ]),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate test cases.")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    if (!state.title.trim() || !state.slug.trim()) {
      setError("Title and slug are required.")
      return
    }

    const memoryLimit = Number(state.memoryLimit)
    if (!Number.isInteger(memoryLimit) || memoryLimit <= 0) {
      setError("Memory limit must be a positive integer.")
      return
    }

    setIsSaving(true)
    setError(null)

    const normalizedTestCases = state.testCases
      .map((testCase) => ({
        input: testCase.input.trim(),
        output: testCase.output.trim(),
        isSample: testCase.isSample,
      }))
      .filter((testCase) => testCase.input && testCase.output)

    if (normalizedTestCases.length !== FIXED_TEST_CASE_COUNT) {
      setError(`Problem must contain exactly ${FIXED_TEST_CASE_COUNT} completed test cases.`)
      setIsSaving(false)
      return
    }

    const payload = {
      title: state.title.trim(),
      slug: state.slug.trim(),
      level: state.level,
      difficulty: state.difficulty,
      isPublished: state.isPublished,
      description: state.description.trim(),
      memoryLimit,
      constraints: state.constraints.trim(),
      inputFormat: state.inputFormat.trim(),
      outputFormat: state.outputFormat.trim(),
      allowedLanguageIds: parseAllowedLanguageIds(state.allowedLanguageIds),
      contestId: state.contestId ? Number(state.contestId) : null,
      tags: parseCsv(state.tags),
      testCases: normalizedTestCases,
    }

    try {
      const response = await fetch(
        state.id ? `/api/manage/problems/${state.id}` : "/api/manage/problems",
        {
          method: state.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to save problem.")
      }

      const saved = (await response.json()) as { id: number }
      if (!state.id) {
        router.replace(`/manage/problems/${saved.id}`)
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save problem.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="flex h-full min-w-0 flex-col overflow-hidden bg-background">
      <SectionNavBar items={
        [
          { label: "Manage" },
          { label: "Problems", href: "/manage/problems" },
          { label: state.title || "Editor" },
        ]
      }
      />

      <div className="flex min-w-0 flex-col gap-4 px-4 py-2">
        <div className="min-w-0 gap-4 py-2">
          <div className="mt-4 flex min-w-0 flex-col gap-4 py-4">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <div className="flex lg:flex-row lg:items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Problem editor</p>
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {state.title || "Untitled problem"}
                </h1>
              </div>
              <div className="flex flex-col self-end gap-4">
                <div className="flex flex-wrap items-center self-end gap-2">
                  <Button variant="outline" onClick={() => router.push("/manage/problems")}>
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => importInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    {isImporting ? <Spinner /> : <FileUp />}
                    Import testcases
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Spinner /> : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground hidden lg:block">
                  Import format: JSON with <code>version</code> and exactly {FIXED_TEST_CASE_COUNT} items in <code>testCases</code>.{" "}
                  <Link className="underline underline-offset-4" href="/api/manage/problems/import?type=testcases">
                    Download template
                  </Link>
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground lg:hidden">
              Import format: JSON with <code>version</code> and exactly {FIXED_TEST_CASE_COUNT} items in <code>testCases</code>.{" "}
              <Link className="underline underline-offset-4" href="/api/manage/problems/import?type=testcases">
                Download template
              </Link>
            </p>
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="grid min-w-0 gap-2 bg-background/60 py-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="problem-level">
                    Level
                  </label>
                  <Select
                    value={state.level}
                    onValueChange={(value) => updateState({ level: value as UserLevel })}
                  >
                    <SelectTrigger id="problem-level" className="w-full">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {levelOptions.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level === "BEGINNER" ? "Beginner" : "Advanced"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid min-w-0 gap-2 bg-background/60 py-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="problem-difficulty">
                    Difficulty
                  </label>
                  <Select
                    value={state.difficulty}
                    onValueChange={(value) => updateState({ difficulty: value as Difficulty })}
                  >
                    <SelectTrigger id="problem-difficulty" className="w-full">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid min-w-0 gap-2 bg-background/60 py-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="problem-memory-limit">
                    Memory limit (MB)
                  </label>
                  <Input
                    id="problem-memory-limit"
                    type="number"
                    min="1"
                    step="1"
                    value={state.memoryLimit}
                    onChange={(event) => updateState({ memoryLimit: event.target.value })}
                    placeholder="256"
                  />
                </div>
                <div className="grid min-w-0 gap-2 bg-background/60 py-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="problem-status">
                    Status
                  </label>
                  <Select
                    value={state.isPublished ? "Published" : "Draft"}
                    onValueChange={(value) => updateState({ isPublished: value === "Published" })}
                  >
                    <SelectTrigger id="problem-status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid min-w-0 gap-2 bg-background/60 py-3 sm:col-span-2 lg:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="problem-contest">
                    Contest
                  </label>
                  <Select
                    value={state.contestId}
                    onValueChange={(value) =>
                      updateState({ contestId: value === "__none__" ? "" : value })
                    }
                  >
                    <SelectTrigger id="problem-contest" className="w-full">
                      <SelectValue
                        placeholder={contestLoading ? "Loading..." : "Select contest"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {contestError ? (
                        <SelectItem value="__error__" disabled>
                          {contestError}
                        </SelectItem>
                      ) : contestOptions.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          No contests found
                        </SelectItem>
                      ) : (
                        contestOptions.map((contest) => (
                          <SelectItem key={contest.id} value={String(contest.id)}>
                            {contest.title} ({contest.level === "BEGINNER" ? "Beginner" : "Advanced"})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid min-w-0 gap-3">
                <div className="grid min-w-0 gap-2 bg-background/60 py-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Allowed languages</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full min-w-0 justify-between">
                        <span className="truncate">
                          {selectedLanguageNames.length > 0
                            ? selectedLanguageNames.join(", ")
                            : "Select languages"}
                        </span>
                        <ChevronDown className="size-4 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-72 w-(--radix-dropdown-menu-trigger-width) max-w-(--radix-dropdown-menu-trigger-width) overflow-auto">
                      {languageLoading ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
                      ) : languageError ? (
                        <div className="px-3 py-2 text-xs text-destructive">{languageError}</div>
                      ) : languageOptions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No languages found.
                        </div>
                      ) : (
                        languageOptions.map((lang) => (
                          <DropdownMenuCheckboxItem
                            key={lang.id}
                            checked={selectedLanguageIds.includes(lang.id)}
                            onCheckedChange={() => toggleLanguage(lang.id)}
                          >
                            {lang.name}
                          </DropdownMenuCheckboxItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid min-w-0 gap-2 bg-background/60 py-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full min-w-0 justify-between">
                        <span className="truncate">
                          {selectedTags.length > 0 ? selectedTags.join(", ") : "Select tags"}
                        </span>
                        <ChevronDown className="size-4 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-72 w-(--radix-dropdown-menu-trigger-width) max-w-(--radix-dropdown-menu-trigger-width) overflow-auto">
                      {tagLoading ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
                      ) : tagError ? (
                        <div className="px-3 py-2 text-xs text-destructive">{tagError}</div>
                      ) : tagOptions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No tags found.
                        </div>
                      ) : (
                        tagOptions.map((tag) => (
                          <DropdownMenuCheckboxItem
                            key={tag.id}
                            checked={selectedTags.includes(tag.name)}
                            onCheckedChange={() => toggleTag(tag.name)}
                          >
                            {tag.name}
                          </DropdownMenuCheckboxItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <ResizablePanelGroup className="min-w-0 border-t">
        <ResizablePanel maxSize="80%" minSize="20%">
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel maxSize="80%" minSize="20%">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <TaskMarkdownEditor
                  title={state.title}
                  value={state.description}
                  onChangeAction={(value) => updateState({ description: value })}
                  onTitleChange={(value) => handleTitleChange(value)}
                  constraints={state.constraints}
                  onConstraintsChange={(value) => updateState({ constraints: value })}
                  inputFormat={state.inputFormat}
                  onInputFormatChange={(value) => updateState({ inputFormat: value })}
                  outputFormat={state.outputFormat}
                  onOutputFormatChange={(value) => updateState({ outputFormat: value })}
                  previewContent={previewContent}
                />
              )}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="30%" maxSize="80%" minSize="20%">
              <TestcaseEditor
                rows={state.testCases}
                onChangeAction={(rows) => updateState({ testCases: buildFixedTestCases(rows) })}
                onGenerateAction={handleGenerateTestcases}
                canGenerate={canGenerateTestcases}
                fixedCount={FIXED_TEST_CASE_COUNT}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel maxSize="80%" minSize="40%">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground h-12">
              <span>Test run editor</span>
              {state.isPublished ? (
                <Badge variant="secondary">Published</Badge>
              ) : (
                <Badge variant="outline">Draft</Badge>
              )}
            </div>
            <div className="flex-1">
              {state.slug.trim() ? (
                <TextEditor
                  slug={state.slug}
                  allowedLanguageIds={parseAllowedLanguageIds(state.allowedLanguageIds)}
                  memoryLimit={Number(state.memoryLimit) || null}
                  allowSubmit={false}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Enter a slug and save the problem to enable testcase runs.
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  )
}
