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
import { Badge } from "@/components/ui/badge";

const LEADERBOARD_SIZE = 10;

type ContestProblemWithProblem = ContestProblem & {
    problem: ProblemListItem;
};

type ContestWithParticipant = Contest & {
    participants?: ContestParticipantWithUser[];
};

type ContestParticipantWithUser = ContestParticipant & {
    user?: User;
};

const getContestStatus = (startAt: Date, endAt: Date): "active" | "upcoming" | "ended" => {
  const now = new Date();
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
};

export default function Page() {
    const { slug } = useParams();
    const { data: session } = useSession();

    const [contest, setContest] = useState<ContestWithParticipant>();
    const [problems, setProblems] = useState<ContestProblemWithProblem[]>([]);
    const [loading, setLoading] = useState(true);
    const [rankings, setRankings] = useState<ContestParticipantWithUser[]>([]);
    const [userRankingData, setUserRankingData] = useState<ContestParticipantWithUser | null>(null);
    const [userRank, setUserRank] = useState<number>(NaN);

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const response = await fetch(`/api/contest/${slug}/leaderboard`);
                if (!response.ok) {
                    throw new Error("Failed to fetch leaderboard");
                }
                const data: ContestParticipantWithUser[] = await response.json();
                const sorted = data.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

                setRankings(sorted);
            } catch (error) {
                console.error("Error fetching rankings:", error);
            }
        };

        fetchRankings();
    }, [slug]);

    useEffect(() => {
        if (!session?.user) return;

        const userIndex = rankings.findIndex((u) => u.userId === session.user.id) ?? NaN;
        const user = rankings[userIndex] ?? null;
        setUserRankingData(user);
        setUserRank(userIndex + 1);
    }, [rankings, session?.user]);

    useEffect(() => {
        const fetchContest = async () => {
            try {
                const params = new URLSearchParams();
                if (session?.user?.id) {
                    params.set("userId", session.user.id);
                }
                const url = params.size ? `/api/contest/${slug}?${params.toString()}` : `/api/contest/${slug}`;
                const response = await fetch(url);
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
    }, [slug, session?.user?.id]);

    if (!contest) return;
    const contestStatus = getContestStatus(contest.startAt, contest.endAt);

    if (loading) {
        return (
            <main className="w-full h-full flex flex-col justify-center items-center rounded-xl bg-background">
                <Spinner />
            </main>
        );
    }

    return (
        <main className="w-full h-full flex flex-col rounded-xl bg-background">
            <SectionNavBar items={[
                { label: "Contest", href: "/contest" },
                { label: contest?.title || "" }
            ]} />

            <div className="container my-7 mx-auto px-4">
                <div className="mb-6">
                    <h1 className="text-xl font-bold">{contest?.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        {contest?.description}
                    </p>
                    {contestStatus !== "active" &&
                        <Badge className="mt-2" variant={"destructive"}>Contest Ended</Badge>
                    }
                </div>
                <div className="flex flex-1 gap-6">
                    <div className="flex-3/4">
                        <h2 className="font-semibold">Problem</h2>
                        <ItemGroup className="mt-4 gap-0 has-[[data-size=sm]]:gap-0 has-[[data-size=xs]]:gap-0">
                            {problems.map((p, index) => (
                                <ProblemItem disabled={contestStatus !== "active"} className={index % 2 == 0 ? "bg-muted" : "bg-background"} prefix={`/contest/${slug}`} key={p.problemId} problem={p.problem} order={index + 1} />
                            ))}
                        </ItemGroup>
                    </div>
                    <div className="flex-1/4">
                        <h2 className="font-semibold text-center">Leaderboard</h2>
                        {rankings.length > 0 ?
                            (
                                <div className="mt-4 flex flex-col justify-center items-center">
                                    {rankings.slice(0, LEADERBOARD_SIZE).map((user, index) => (
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
                                                    <div className="font-semibold">{user.user?.name} {user.userId === session?.user?.id ? "(You)" : ""}</div>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "w-10 h-10 flex items-center justify-center",
                                                index === 0 ? "text-yellow-600 dark:text-yellow-400 drop-shadow-lg" :
                                                    index === 1 ? "text-gray-600 dark:text-gray-300 drop-shadow-lg" :
                                                        index === 2 ? "text-orange-600 dark:text-orange-400 drop-shadow-lg" :
                                                            ""
                                            )}>{user.totalScore}</div>
                                        </div>
                                    ))}

                                    <div className="mt-6 w-full">
                                        {!loading ? (
                                            userRank > LEADERBOARD_SIZE && (
                                                <div>
                                                    <h2 className="font-semibold text-center mb-4">Your Ranking</h2>
                                                    <div className="flex w-full items-center justify-between text-sm bg-blue-400/10">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className="text-blue-500 font-semibold flex items-center justify-center w-10 h-10">
                                                                {userRank}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold">{userRankingData?.user?.name}</div>
                                                            </div>
                                                        </div>
                                                        <div className="w-10 h-10 font-bold text-blue-500 flex items-center justify-center">
                                                            {userRankingData?.totalScore}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex justify-center items-center">
                                                <Spinner />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                            :
                            (
                                <div className="mt-4 flex flex-col justify-center items-center">
                                    <span className="text-muted-foreground text-xs">
                                        No participants yet.
                                    </span>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>
        </main >
    )
}
