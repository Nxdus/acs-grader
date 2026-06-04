"use client"

import { useEffect, useMemo, useState } from "react"
import { Award, ChartNoAxesColumn, Medal, TrendingUp } from "lucide-react"

import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type RankingUser = {
  id: string
  name: string
  email: string
  image?: string | null
  score: number
  attended: number
  role: string
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US")
}

function rankBadgeClassName(rank: number) {
  if (rank === 1) return "border-yellow-400 text-yellow-600 dark:text-yellow-400"
  if (rank === 2) return "border-slate-400 text-slate-600 dark:text-slate-300"
  if (rank === 3) return "border-amber-600 text-amber-700 dark:text-amber-400"
  return "border-border text-muted-foreground"
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { data: session } = useSession()

  useEffect(() => {
    let cancelled = false

    async function fetchRankings() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/rankings")
        if (!response.ok) {
          throw new Error("Failed to fetch rankings.")
        }

        const data = (await response.json()) as RankingUser[]
        const sorted = [...data].sort((a, b) => (b.score || 0) - (a.score || 0))

        if (!cancelled) {
          setRankings(sorted)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch rankings.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchRankings()

    return () => {
      cancelled = true
    }
  }, [])

  const totalParticipants = rankings.length
  const topRankings = rankings.slice(0, 10)
  const topThree = topRankings.slice(0, 3)
  const userRank = rankings.findIndex((user) => user.id === session?.user?.id)
  const userRankData = userRank >= 0 ? rankings[userRank] : null
  const leaderScore = rankings[0]?.score ?? 0
  const averageScore = useMemo(() => {
    if (rankings.length === 0) return 0
    return Math.round(rankings.reduce((sum, user) => sum + (user.score || 0), 0) / rankings.length)
  }, [rankings])

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar items={[{ label: "Ranking" }]} />

      <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Leaderboard</p>
            <h1 className="text-2xl font-semibold tracking-tight">Ranking</h1>
          </div>
          {userRankData ? (
            <Badge className="w-fit" variant="outline">
              Your rank: #{userRank + 1}
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <ChartNoAxesColumn className="size-4" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{formatNumber(totalParticipants)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="size-4" />
                Leader score
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{formatNumber(leaderScore)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <Award className="size-4" />
                Average score
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{formatNumber(averageScore)}</CardContent>
          </Card>
        </div>

        {userRankData ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-4 py-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center border bg-background text-sm font-semibold">
                  #{userRank + 1}
                </div>
                <Avatar className="size-10">
                  <AvatarImage src={userRankData.image ?? "/avatar.png"} alt={userRankData.name} />
                  <AvatarFallback>{initialsFromName(userRankData.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{userRankData.name}</div>
                  <div className="text-xs text-muted-foreground">Your current position</div>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl font-semibold">{formatNumber(userRankData.score || 0)}</div>
                <div className="text-xs text-muted-foreground">score</div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {topThree.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {topThree.map((user, index) => {
              const rank = index + 1
              return (
                <Card key={user.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm">
                        <Medal
                          className={cn(
                            "size-4",
                            rank === 1
                              ? "text-yellow-500"
                              : rank === 2
                                ? "text-slate-400"
                                : "text-amber-600"
                          )}
                        />
                        Top {rank}
                      </span>
                      <Badge className={rankBadgeClassName(rank)} variant="outline">
                        #{rank}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarImage src={user.image ?? "/avatar.png"} alt={user.name} />
                        <AvatarFallback>{initialsFromName(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{user.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xl font-semibold">{formatNumber(user.score || 0)}</div>
                      <div className="text-xs text-muted-foreground">score</div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Global rankings</CardTitle>
            <p className="text-sm text-muted-foreground">Top 10 users ordered by total score.</p>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Attended</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        <div className="flex justify-center">
                          <Spinner />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : topRankings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        No ranking data available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topRankings.map((user, index) => {
                      const rank = index + 1
                      const isCurrentUser = user.id === session?.user?.id

                      return (
                        <TableRow key={user.id} className={isCurrentUser ? "bg-primary/5" : undefined}>
                          <TableCell>
                            <Badge className={rankBadgeClassName(rank)} variant="outline">
                              #{rank}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-9">
                                <AvatarImage src={user.image ?? "/avatar.png"} alt={user.name} />
                                <AvatarFallback>{initialsFromName(user.name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="truncate font-medium">
                                  {user.name}
                                  {isCurrentUser ? (
                                    <span className="ml-2 text-xs text-muted-foreground">You</span>
                                  ) : null}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatNumber(user.attended || 0)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {formatNumber(user.score || 0)}
                          </TableCell>
                        </TableRow>
                      )
                    })
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
