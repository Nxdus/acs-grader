"use client"

import SearchInput from "@/components/problems/search-input"

import { Spinner } from "@/components/ui/spinner"
import { ItemGroup } from "@/components/ui/item"
import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSession } from "@/lib/auth-client"

import { useEffect, useState } from "react"

import {
    ArrowDownUp,
    Funnel,
} from "lucide-react"
import ProblemItem, { type ProblemListItem } from "@/components/problems/problem-item"

export default function Problems() {
    const topics = ["All Topics", "Arrays", "Strings", "Linked Lists", "Trees", "Graphs", "Dynamic Programming", "Sorting", "Searching", "Math", "Greedy", "Backtracking", "Recursion"]
    const [data, setData] = useState<ProblemListItem[]>([])
    const [selectedTopic, setSelectedTopic] = useState<string>("All Topics")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [search, setSearch] = useState("")
    const { data: session } = useSession()

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
    }, [search, session?.user?.id])

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
                            <Button size="icon" variant="outline"><ArrowDownUp /></Button>
                            <Button size="icon" variant="outline"><Funnel /></Button>
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
                            {data.map((p, index) => (
                                <ProblemItem className={index % 2 == 0 ? "bg-muted" : "bg-background"} key={p.id} problem={p} order={index + 1} />
                            ))}
                        </ItemGroup>
                    )}
                </div>
            </div>
        </main>
    )
}
