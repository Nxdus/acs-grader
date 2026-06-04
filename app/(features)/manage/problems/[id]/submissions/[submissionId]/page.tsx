"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

type SubmissionDetail = {
  id: number
  code: string
  status: string
  language: string
  languageId: number
  executionTime: number | null
  memoryUsed: number | null
  score: number | null
  contestId: number | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
  problem: {
    id: number
    slug: string
    title: string
  }
  contest?: {
    id: number
    slug: string
    title: string
  } | null
  results: Array<{
    id: number
    testCaseId: number
    actualOutput: string | null
    passed: boolean
    runtime: number | null
  }>
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

export default function ManageProblemSubmissionDetailPage() {
  const params = useParams<{ id: string; submissionId: string }>()
  const problemId = Number(params.id)
  const submissionId = Number(params.submissionId)

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSubmission = useCallback(
    async (signal?: AbortSignal) => {
      if (!Number.isInteger(problemId) || problemId <= 0 || !Number.isInteger(submissionId) || submissionId <= 0) {
        setError("Invalid submission route.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/manage/problems/${problemId}/submissions/${submissionId}`, {
          signal,
        })

        if (!response.ok) {
          throw new Error("Failed to load submission.")
        }

        setSubmission((await response.json()) as SubmissionDetail)
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Failed to load submission.")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [problemId, submissionId]
  )

  useEffect(() => {
    const controller = new AbortController()
    loadSubmission(controller.signal)
    return () => controller.abort()
  }, [loadSubmission])

  const passedCount = useMemo(
    () => submission?.results.filter((result) => result.passed).length ?? 0,
    [submission]
  )

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar
        items={[
          { label: "Manage" },
          { label: "Problems", href: "/manage/problems" },
          ...(submission
            ? [
                { label: submission.problem.title, href: `/manage/problems/${submission.problem.id}` },
                { label: "Submissions", href: `/manage/problems/${submission.problem.id}/submissions` },
                { label: `#${submission.id}` },
              ]
            : [{ label: "Submission" }]),
        ]}
      />

      <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {submission ? `${submission.problem.slug} by ${submission.user.email}` : "Submission detail"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {submission ? `Submission #${submission.id}` : "Submission"}
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" asChild>
              <Link href={`/manage/problems/${problemId}/submissions`}>Back to submissions</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/manage/problems/${problemId}`}>Edit problem</Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent>
          </Card>
        ) : submission ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={statusBadgeClassName(submission.status)} variant="outline">
                    {statusLabel(submission.status)}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Score</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{submission.score ?? 0}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Execution time</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {formatSeconds(submission.executionTime)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Memory</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {formatMemoryFromKb(submission.memoryUsed) ?? "-"}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Submission metadata</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">User</div>
                  <div className="font-medium">{submission.user.name}</div>
                  <div className="text-xs text-muted-foreground">{submission.user.email}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Language</div>
                  <div className="font-medium">{submission.language}</div>
                  <div className="text-xs text-muted-foreground">Judge id {submission.languageId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Submitted</div>
                  <div className="font-medium">{formatTime(submission.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tests</div>
                  <div className="font-medium">
                    {passedCount}/{submission.results.length} passed
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Submitted code</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[680px] overflow-auto border bg-muted/30 p-4 text-xs leading-5">
                  <code>{submission.code}</code>
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test results</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test case</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Runtime</TableHead>
                        <TableHead>Output</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submission.results.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                            No test result rows were saved for this submission.
                          </TableCell>
                        </TableRow>
                      ) : (
                        submission.results.map((result) => (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">#{result.testCaseId}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  result.passed
                                    ? "border-green-400 text-green-500"
                                    : "border-red-400 text-red-500"
                                }
                                variant="outline"
                              >
                                {result.passed ? "Passed" : "Failed"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatSeconds(result.runtime)}
                            </TableCell>
                            <TableCell className="max-w-md">
                              <pre className="max-h-36 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                                {result.actualOutput ?? "-"}
                              </pre>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  )
}
