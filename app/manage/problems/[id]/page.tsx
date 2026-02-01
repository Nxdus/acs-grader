"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown } from "lucide-react"

const difficultyOptions = ["EASY", "MEDIUM", "HARD"] as const

type Difficulty = (typeof difficultyOptions)[number]

type ProblemDetail = {
  id: number
  slug: string
  title: string
  description: string | null
  difficulty: Difficulty
  constraints: string | null
  inputFormat: string | null
  outputFormat: string | null
  allowedLanguageIds: number[]
  isPublished: boolean
  tags: string[]
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

type FormState = {
  id?: number
  title: string
  slug: string
  difficulty: Difficulty
  isPublished: boolean
  description: string
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

function createEmptyState(): FormState {
  return {
    title: "",
    slug: "",
    difficulty: difficultyOptions[0],
    isPublished: true,
    description: "",
    constraints: "",
    inputFormat: "",
    outputFormat: "",
    allowedLanguageIds: "",
    tags: "",
    testCases: [emptyTestcase()],
  }
}

function buildTaskMarkdown(state: FormState) {
  const content: string[] = []
  content.push(`# ${state.title || "Untitled Problem"}`)

  if (state.description) {
    content.push(state.description)
  }

  if (state.constraints) {
    content.push(`## Constraints\n${state.constraints}`)
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

  const [state, setState] = useState<FormState>(createEmptyState())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [languageOptions, setLanguageOptions] = useState<JudgeLanguage[]>([])
  const [languageLoading, setLanguageLoading] = useState(false)
  const [languageError, setLanguageError] = useState<string | null>(null)
  const [tagOptions, setTagOptions] = useState<TagOption[]>([])
  const [tagLoading, setTagLoading] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)

  const previewContent = useMemo(() => buildTaskMarkdown(state), [state])
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
        difficulty: detail.difficulty ?? difficultyOptions[0],
        isPublished: Boolean(detail.isPublished),
        description: detail.description ?? "",
        constraints: detail.constraints ?? "",
        inputFormat: detail.inputFormat ?? "",
        outputFormat: detail.outputFormat ?? "",
        allowedLanguageIds: (detail.allowedLanguageIds ?? []).join(", "),
        tags: (detail.tags ?? []).join(", "),
        testCases:
          detail.testCases.length > 0
            ? detail.testCases.map((testCase) => ({
              id: String(testCase.id),
              input: testCase.input,
              output: testCase.output,
              isSample: testCase.isSample,
            }))
            : [emptyTestcase()],
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

  async function handleSave() {
    if (!state.title.trim() || !state.slug.trim()) {
      setError("Title and slug are required.")
      return
    }

    setIsSaving(true)
    setError(null)

    const payload = {
      title: state.title.trim(),
      slug: state.slug.trim(),
      difficulty: state.difficulty,
      isPublished: state.isPublished,
      description: state.description.trim(),
      constraints: state.constraints.trim(),
      inputFormat: state.inputFormat.trim(),
      outputFormat: state.outputFormat.trim(),
      allowedLanguageIds: parseAllowedLanguageIds(state.allowedLanguageIds),
      tags: parseCsv(state.tags),
      testCases: state.testCases
        .map((testCase) => ({
          input: testCase.input.trim(),
          output: testCase.output.trim(),
          isSample: testCase.isSample,
        }))
        .filter((testCase) => testCase.input && testCase.output),
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
    <main className="w-full h-full flex flex-col bg-background">
      <SectionNavBar items={
        [
          { label: "Manage" },
          { label: "Problems", href: "/manage/problems" },
          { label: state.title || "Editor" },
        ]
      }
      />

      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex items-end justify-between gap-4 overflow-x-auto py-2">
          <div className="min-w-[220px]">
            <p className="text-sm text-muted-foreground">Problem editor</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {state.title || "Untitled problem"}
            </h1>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex items-center gap-3">
              <div className="grid gap-2 min-w-[160px]">
                <label className="text-sm font-medium" htmlFor="problem-difficulty">
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
              <div className="grid gap-2 min-w-[160px]">
                <label className="text-sm font-medium" htmlFor="problem-status">
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
              <div className="grid gap-2 min-w-[240px]">
                <label className="text-sm font-medium">Allowed languages</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full max-w-[280px] justify-between">
                      <span className="truncate">
                        {selectedLanguageNames.length > 0
                          ? selectedLanguageNames.join(", ")
                          : "Select languages"}
                      </span>
                      <ChevronDown className="size-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] max-w-[var(--radix-dropdown-menu-trigger-width)] overflow-auto">
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
              <div className="grid gap-2 min-w-[200px]">
                <label className="text-sm font-medium">Tags</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full max-w-[280px] justify-between">
                      <span className="truncate">
                        {selectedTags.length > 0 ? selectedTags.join(", ") : "Select tags"}
                      </span>
                      <ChevronDown className="size-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] max-w-[var(--radix-dropdown-menu-trigger-width)] overflow-auto">
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

            <span className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push("/manage/problems")}>
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

      <ResizablePanelGroup className="border-t">
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
                onChange={(rows) => updateState({ testCases: rows })}
                onAdd={() => updateState({ testCases: [...state.testCases, emptyTestcase()] })}
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
