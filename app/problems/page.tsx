"use client"

import SearchInput from "@/components/problems/search-input"

import { ItemGroup } from "@/components/ui/item"
import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

import { useState } from "react"
import Link from "next/link"

import {
    ArrowDownUp,
    Funnel,
    SearchIcon,
} from "lucide-react"
import ProblemItem from "@/components/problems/problem-item"

interface Problem {
    id: number;
    title: string;
    topic: string;
    participants: number;
    success: number;
    difficulty: string;
}

const problemsData: Problem[] = [
    { id: 1, title: "Two Sum", topic: "Arrays", participants: 1500, success: 800, difficulty: "Easy" },
    { id: 2, title: "Longest Substring Without Repeating Characters", topic: "Strings", participants: 1200, success: 600, difficulty: "Med." },
    { id: 3, title: "Merge Two Sorted Lists", topic: "Linked Lists", participants: 900, success: 500, difficulty: "Easy" },
    { id: 4, title: "Binary Tree Inorder Traversal", topic: "Trees", participants: 1100, success: 700, difficulty: "Med." },
    { id: 5, title: "Dijkstra's Algorithm", topic: "Graphs", participants: 800, success: 300, difficulty: "Hard" },
    { id: 6, title: "Longest Increasing Subsequence", topic: "Dynamic Programming", participants: 950, success: 400, difficulty: "Med." },
    { id: 7, title: "Quick Sort", topic: "Sorting", participants: 700, success: 350, difficulty: "Med." },
    { id: 8, title: "Binary Search", topic: "Searching", participants: 1300, success: 900, difficulty: "Easy" },
    { id: 9, title: "Prime Number Generation", topic: "Math", participants: 600, success: 250, difficulty: "Med." },
    { id: 10, title: "Activity Selection Problem", topic: "Greedy", participants: 500, success: 200, difficulty: "Hard" },
    { id: 11, title: "N-Queens Problem", topic: "Backtracking", participants: 400, success: 150, difficulty: "Hard" },
    { id: 12, title: "Factorial Calculation", topic: "Recursion", participants: 1400, success: 1000, difficulty: "Easy" },
]

function Problems() {
    const [topic, setTopic] = useState(["All Topics", "Arrays", "Strings", "Linked Lists", "Trees", "Graphs", "Dynamic Programming", "Sorting", "Searching", "Math", "Greedy", "Backtracking", "Recursion"]);
    const [itemsByTopic, setItemsByTopic] = useState<Problem[]>(problemsData);
    const [selectedTopic, setSelectedTopic] = useState<string | null>("All Topics");

    const [search, setSearch] = useState("")

    return (
        <main className="w-full h-full flex flex-col rounded-xl bg-background">
            <SectionNavBar items={[{ label: "Problems" }]} />

            <div className="container my-7 mx-auto px-4">
                <div className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
                    {topic.map((t) => (
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
                    <ItemGroup className="mt-4 gap-0 has-[[data-size=sm]]:gap-0 has-[[data-size=xs]]:gap-0">
                        {itemsByTopic.map((p, index) => (
                            <ProblemItem className={index % 2 == 0 ? "bg-muted" : "bg-background"} key={p.id} problem={p} order={index + 1} />
                        ))}
                    </ItemGroup>
                </div>
            </div>
        </main>
    )
}
export default Problems
