"use client"

import { useRef } from "react"

import TaskMarkdown from "@/components/problems/task-markdown"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
} from "lucide-react"

type TaskMarkdownEditorProps = {
  title: string
  value: string
  onChangeAction: (value: string) => void
  onTitleChange: (value: string) => void
  constraints: string
  onConstraintsChange: (value: string) => void
  inputFormat: string
  onInputFormatChange: (value: string) => void
  outputFormat: string
  onOutputFormatChange: (value: string) => void
  previewContent: string
  className?: string
}

type InsertOptions = {
  prefix: string
  suffix?: string
  placeholder?: string
  multiline?: boolean
}

export default function TaskMarkdownEditor({
  title,
  value,
  onChangeAction,
  onTitleChange,
  constraints,
  onConstraintsChange,
  inputFormat,
  onInputFormatChange,
  outputFormat,
  onOutputFormatChange,
  previewContent,
  className,
}: TaskMarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const toolbarActions = [
    { label: "H1", icon: Heading1, action: () => insertMarkdown({ prefix: "# ", multiline: true }) },
    { label: "H2", icon: Heading2, action: () => insertMarkdown({ prefix: "## ", multiline: true }) },
    { label: "Bold", icon: Bold, action: () => insertMarkdown({ prefix: "**", suffix: "**", placeholder: "bold" }) },
    { label: "Italic", icon: Italic, action: () => insertMarkdown({ prefix: "*", suffix: "*", placeholder: "italic" }) },
    { label: "Quote", icon: Quote, action: () => insertMarkdown({ prefix: "> ", multiline: true }) },
    { label: "Bullet", icon: List, action: () => insertMarkdown({ prefix: "- ", multiline: true }) },
    { label: "Numbered", icon: ListOrdered, action: () => insertMarkdown({ prefix: "1. ", multiline: true }) },
    { label: "Code", icon: Code, action: () => insertMarkdown({ prefix: "`", suffix: "`", placeholder: "code" }) },
    { label: "Link", icon: LinkIcon, action: () => insertMarkdown({ prefix: "[", suffix: "](https://)", placeholder: "link" }) },
  ]

  function insertMarkdown({ prefix, suffix = "", placeholder = "", multiline = false }: InsertOptions) {
    const element = textareaRef.current
    if (!element) {
      onChangeAction(value + prefix + placeholder + suffix)
      return
    }

    const start = element.selectionStart ?? 0
    const end = element.selectionEnd ?? 0
    const selected = value.slice(start, end)

    const nextText =
      selected.length > 0
        ? applyToSelection(selected, prefix, suffix, multiline)
        : `${prefix}${placeholder}${suffix}`

    const nextValue = value.slice(0, start) + nextText + value.slice(end)
    onChangeAction(nextValue)

    requestAnimationFrame(() => {
      const cursor = start + nextText.length
      element.focus()
      element.setSelectionRange(cursor, cursor)
    })
  }

  function applyToSelection(text: string, prefix: string, suffix: string, multiline: boolean) {
    if (!multiline) {
      return `${prefix}${text}${suffix}`
    }

    return text
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n")
  }

  return (
    <div className={cn("h-full w-full overflow-hidden bg-background", className)}>
      <Tabs defaultValue="edit" className="flex h-full flex-col">
        <div className="flex h-12 items-center justify-between border-b px-3">
          <TabsList className="h-8 bg-muted/60">
            <TabsTrigger value="edit" className="text-xs">
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              Preview
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="edit" className="flex-1 overflow-auto p-0">
          <div className="flex min-h-full flex-col gap-3 p-3">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="md-title">
                Title
              </label>
              <Input
                id="md-title"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Problem title"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="md-description">
                  Description
                </label>
                <div className="flex flex-wrap items-center gap-1">
                  {toolbarActions.map((item) => {
                    const Icon = item.icon
                    return (
                      <Button
                        key={item.label}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={item.action}
                      >
                        <Icon className="size-4" />
                      </Button>
                    )
                  })}
                </div>
              </div>
              <Textarea
                id="md-description"
                ref={textareaRef}
                value={value}
                onChange={(event) => onChangeAction(event.target.value)}
                className="min-h-40 resize-none font-mono text-xs leading-relaxed"
                placeholder="Write your problem statement in Markdown..."
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="md-constraints">
                  Constraints
                </label>
                <Textarea
                  id="md-constraints"
                  value={constraints}
                  onChange={(event) => onConstraintsChange(event.target.value)}
                  className="min-h-24 resize-none font-mono text-xs leading-relaxed"
                  placeholder="e.g. 1 <= n <= 10^5"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="md-input">
                  Input
                </label>
                <Textarea
                  id="md-input"
                  value={inputFormat}
                  onChange={(event) => onInputFormatChange(event.target.value)}
                  className="min-h-24 resize-none font-mono text-xs leading-relaxed"
                  placeholder="Describe the input format."
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="md-output">
                  Output
                </label>
                <Textarea
                  id="md-output"
                  value={outputFormat}
                  onChange={(event) => onOutputFormatChange(event.target.value)}
                  className="min-h-24 resize-none font-mono text-xs leading-relaxed"
                  placeholder="Describe the output format."
                />
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="preview" className="flex-1 overflow-hidden p-0">
          <TaskMarkdown content={previewContent} className="h-full" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
