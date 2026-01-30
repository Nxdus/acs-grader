"use client"

import { SectionNavBar } from "@/components/sidebar/section-navbar";
import { Contest, ContestParticipant, ContestProblem, User } from "@/generated/prisma/client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { ItemGroup } from "@/components/ui/item";
import ProblemItem, { ProblemListItem } from "@/components/problems/problem-item";
import { useSession } from "@/lib/auth-client";
import { ChessQueen, ChessRook, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type ContestProblemWithProblem = ContestProblem & {
    problem: ProblemListItem;
};

type ContestWithParticipant = Contest & {
    participants?: ContestParticipantWithUser[];
};

type ContestParticipantWithUser = ContestParticipant & {
    user?: User;
};

export default function Page() {
    const { slug } = useParams();
    const { data: session } = useSession()

    const [contest, setContest] = useState<ContestWithParticipant>();
    const [problems, setProblems] = useState<ContestProblemWithProblem[]>([]);
    const [loading, setLoading] = useState(true);
    const [rankings, setRankings] = useState<User[]>([]);

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const response = await fetch("/api/rankings");
                if (!response.ok) {
                    throw new Error("Failed to fetch rankings");
                }
                const data: User[] = await response.json();
                const sorted = data.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10)

                setRankings([...sorted, ...sorted, ...sorted, ...sorted, ...sorted, ...sorted, ...sorted, ...sorted, ...sorted, ...sorted])
            } catch (error) {
                console.error("Error fetching rankings:", error);
            }
        };

        fetchRankings();
    }, []);

    useEffect(() => {
        const fetchContest = async () => {
            try {
                const response = await fetch(`/api/contest/${slug}`);
                if (!response.ok) throw new Error("Failed to fetch contest");

                const data = await response.json();

                setContest(data);
                setProblems(Array.isArray(data.problems) ? data.problems : []);
            } catch (error) {
                console.error("Failed to fetch contest:", error);
                setProblems([]);
            } finally {
                setLoading(false);
            }
        };

        if (slug) fetchContest();
    }, [slug]);

    if (loading) {
        return (
            <main className="w-full h-full flex flex-col justify-center items-center rounded-xl bg-background">
                <Spinner />
            </main>
        );
    }

    return (
        <main className="w-full h-full flex flex-col rounded-xl bg-background">
            <SectionNavBar items={[{ label: contest?.title || "" }]} />

            <div className="container my-7 mx-auto px-4">
                <div className="mb-6">
                    <h1 className="text-xl font-bold">{contest?.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        {contest?.description}
                    </p>
                </div>
                <div className="flex flex-1 gap-6">
                    <div className="flex-3/4">
                        <h2 className="font-semibold">Problem</h2>
                        <ItemGroup className="mt-4 gap-0 has-[[data-size=sm]]:gap-0 has-[[data-size=xs]]:gap-0">
                            {problems.map((p, index) => (
                                <ProblemItem className={index % 2 == 0 ? "bg-muted" : "bg-background"} key={p.problemId} problem={p.problem} order={index + 1} />
                            ))}
                        </ItemGroup>
                    </div>
                    <div className="flex-1/4">
                        <h2 className="font-semibold text-center">Leaderboard</h2>
                        <div className="mt-4 flex flex-col justify-center items-center">
                            {rankings.map((user, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex w-full items-center justify-between text-sm",
                                        index === 0 ? "bg-linear-to-br from-yellow-300/30 to-yellow-500/10 border-0" :
                                            index === 1 ? "bg-linear-to-br from-gray-400/30 to-gray-100/10 dark:from-gray-300/30 dark:to-gray-500/10 border-0" :
                                                index === 2 ? "bg-linear-to-br from-orange-300/30 to-orange-500/10 border-0" :
                                                    "bg-muted"
                                    )}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="flex items-center justify-center w-10 h-10">
                                            {index === 0 ? <Crown className="text-yellow-500 drop-shadow-lg" size={16} /> : index === 1 ? <ChessQueen className="text-gray-400 drop-shadow-lg" size={16} /> : index === 2 ? <ChessRook className="text-orange-500 drop-shadow-lg" size={16} /> : index + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold">{user.name} {user.id === session?.user?.id ? "(You)" : ""}</div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-10 flex items-center justify-center",
                                        index === 0 ? "text-yellow-600 dark:text-yellow-400 drop-shadow-lg" :
                                            index === 1 ? "text-gray-600 dark:text-gray-300 drop-shadow-lg" :
                                                index === 2 ? "text-orange-600 dark:text-orange-400 drop-shadow-lg" :
                                                    ""
                                    )}>{user.score}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main >
    )
}