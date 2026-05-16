"use client"

import SearchInput from "@/components/problems/search-input"

import { Spinner } from "@/components/ui/spinner"
import { ItemGroup } from "@/components/ui/item"
import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useSession } from "@/lib/auth-client"

import { useEffect, useMemo, useState } from "react"

import {
    ArrowDownUp,
    Funnel,
} from "lucide-react"
import ProblemItem, { type ProblemListItem } from "@/components/problems/problem-item"

const ALL_TOPICS = "All Topics"
const sortOptions = [
    { value: "createdAt", label: "Newest" },
    { value: "title", label: "Title" },
    { value: "difficulty", label: "Difficulty" },
    { value: "participantCount", label: "Participants" },
    { value: "successCount", label: "Solved" },
] as const

type SortKey = (typeof sortOptions)[number]["value"]
type SortDirection = "asc" | "desc"
type ProgressFilter = "all" | "solved" | "attempted" | "unsolved"

export default function Problems() {
    const [topics, setTopics] = useState<string[]>([ALL_TOPICS])
    const [data, setData] = useState<ProblemListItem[]>([])
    const [selectedTopic, setSelectedTopic] = useState<string>(ALL_TOPICS)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [search, setSearch] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("createdAt")
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
    const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all")
    const { data: session } = useSession()
    const userLevel = session?.user?.level ?? "BEGINNER"

    useEffect(() => {
        const loadTags = async () => {
            const response = await fetch("/api/tags")
            if (!response.ok) return

            const tags = (await response.json()) as { name: string }[]
            setTopics([ALL_TOPICS, ...tags.map((tag) => tag.name)])
        }

        void loadTags()
    }, [])

    useEffect(() => {
        const controller = new AbortController()

        const loadTasks = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const params = new URLSearchParams()
                if (search) {
                    params.set("search", search)
                }
                if (selectedTopic !== ALL_TOPICS) {
                    params.set("tag", selectedTopic)
                }
                params.set("level", userLevel)
                params.set("sort", sortKey)
                params.set("dir", sortDirection)
                if (session?.user?.id) {
                    params.set("userId", session.user.id)
                }

                const url = params.size ? `/api/tasks?${params.toString()}` : "/api/tasks"
                const response = await fetch(url, { signal: controller.signal })

                if (!response.ok) {
                    throw new Error("Failed to load tasks.")
                }

                const payload = await response.json()
                setData(payload.items ?? [])
            } catch (err) {
                if (!(err instanceof DOMException && err.name === "AbortError")) {
                    setError("Failed to load tasks. Please try again.")
                }
            } finally {
                setIsLoading(false)
            }
        }

        loadTasks()

        return () => controller.abort()
    }, [search, selectedTopic, session?.user?.id, sortDirection, sortKey, userLevel])

    const visibleProblems = useMemo(
        () =>
            data
                .filter((p) => p.contestProblems.length === 0)
                .filter((p) => {
                    if (progressFilter === "solved") return p.submissionStatus === "ACCEPTED"
                    if (progressFilter === "attempted") return p.hasSubmission && p.submissionStatus !== "ACCEPTED"
                    if (progressFilter === "unsolved") return !p.hasSubmission
                    return true
                }),
        [data, progressFilter]
    )

    return (
        <main className="w-full h-full flex flex-col rounded-xl bg-background">
            <SectionNavBar items={[{ label: "Problems" }]} />

            <div className="container my-7 mx-auto px-4">
                <div className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
                    {topics.map((t) => (
                        <Button
                            key={t}
                            onClick={() => setSelectedTopic(t)}
                            variant={selectedTopic == t ? "default" : "secondary"}
                            className="shrink-0 border-0"
                            draggable={false}
                        >
                            {t}
                        </Button>
                    ))}
                </div>
                <Separator className="my-4" />
                <div>
                    <div className="flex justify-between">
                        <SearchInput setSearchAction={setSearch} />
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="outline" aria-label="Sort problems"><ArrowDownUp /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                                        {sortOptions.map((option) => (
                                            <DropdownMenuRadioItem key={option.value} value={option.value}>
                                                {option.label}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                                        <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="outline" aria-label="Filter problems"><Funnel /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuLabel>Level: {userLevel === "ADVANCED" ? "Advanced" : "Beginner"}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Progress</DropdownMenuLabel>
                                    <DropdownMenuRadioGroup value={progressFilter} onValueChange={(value) => setProgressFilter(value as ProgressFilter)}>
                                        <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="solved">Solved</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="attempted">Attempted</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="unsolved">Unsolved</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="py-8 flex justify-center">
                            <Spinner />
                        </div>
                    ) : error ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            {error}
                        </div>
                    ) : (
                        <ItemGroup className="mt-4 gap-0 has-[[data-size=sm]]:gap-0 has-[[data-size=xs]]:gap-0">
                            {visibleProblems.map((p, index) => (
                                <ProblemItem
                                    key={p.id}
                                    className={index % 2 === 0 ? "bg-muted" : "bg-background"}
                                    prefix="/problems"
                                    problem={p}
                                    order={index + 1}
                                />
                            ))}

                        </ItemGroup>
                    )}
                </div>
            </div>
        </main>
    )
}
