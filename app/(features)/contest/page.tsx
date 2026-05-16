"use client";

import { SectionNavBar } from "@/components/sidebar/section-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, Eye, LogIn, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Contest } from "@/generated/prisma/client";
import { ContestParticipant } from "@/generated/prisma/client";
import { useSession } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { toast } from "sonner";

type ContestWithStatus = Contest & {
  status: "active" | "upcoming" | "ended";
  participants?: Array<ContestParticipant>;
};

enum Role {
  USER = "USER",
  STAFF = "STAFF",
  ADMIN = "ADMIN",
}

const getContestStatus = (startAt: Date, endAt: Date): "active" | "upcoming" | "ended" => {
  const now = new Date();
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-500/20 text-green-700";
    case "upcoming":
      return "bg-blue-500/20 text-blue-700";
    case "ended":
      return "bg-red-500/20 text-red-700";
    default:
      return "bg-gray-500/20 text-gray-700";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "active":
      return "Active";
    case "upcoming":
      return "Upcoming";
    case "ended":
      return "Ended";
    default:
      return status;
  }
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function Page() {
  const [contests, setContests] = useState<ContestWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: session } = useSession()

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const response = await fetch("/api/contest");
        const data = await response.json();

        const contestsWithStatus = data.map((contest: Contest) => ({
          ...contest,
          status: getContestStatus(contest.startAt, contest.endAt),
        }));

        setContests(contestsWithStatus);
      } catch (error) {
        console.error("Failed to fetch contests:", error);
        setContests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  async function handleJoin(contestId: number) {
    if (!session?.user?.id) {
      toast.error("Please sign in before submitting.");
      return;
    }

    try {
      const response = await fetch(`/api/contest/${contestId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data?.error === "string" ? data.error : "Join failed.";
        toast.error(errorMessage);
        return;
      }

      if (data.joined) return;

      toast.success("Join successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Join failed.");
    }
  };

  if (loading) {
    return (
      <main className="w-full h-full flex flex-col rounded-xl bg-background">
        <SectionNavBar items={[{ label: "Contest" }]} />
        <div className="container flex flex-1 my-7 mx-auto px-4 justify-center items-center">
          <Spinner />
        </div>
      </main>
    );
  }

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar items={[{ label: "Contest" }]} />

      <div className="container my-7 mx-auto px-4">
        <div>
          <h1 className="text-xl font-bold">Contests</h1>
          <p className="text-sm text-muted-foreground">
            Join programming contests, compete with other developers, and
            improve your skills.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-8">
          <Card className="p-4 bg-linear-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {contests.filter((c) => c.status === "active").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600/50" />
            </div>
          </Card>
          <Card className="p-4 bg-linear-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">
                  {contests.filter((c) => c.status === "upcoming").length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600/50" />
            </div>
          </Card>
          <Card className="p-4 bg-linear-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Participants
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {contests.reduce(
                    (sum, c) => sum + (c.participants?.length ?? 0),
                    0,
                  )}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600/50" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {contests.map((contest) => (
            <Card
              key={contest.id}
              className="relative overflow-hidden hover:shadow-lg transition-shadow border-0 p-0 gap-0"
            >
              <Badge className={`absolute right-2 top-2 ${getStatusColor(contest.status)}`}>
                {getStatusLabel(contest.status)}
              </Badge>
              <div className="flex flex-1 justify-between p-5">
                <div className="flex flex-col items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {contest.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {contest.description || "No description available"}
                    </p>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground py-2">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{contest.participants?.length ?? 0} participants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(contest.startAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {contest.status === "active" ? (
                <Button onClick={() => handleJoin(contest.id)} className="w-full border-0 hover:bg-secondary-foreground/90" variant="default" asChild>
                  <Link href={`/contest/${contest.slug}`}>
                    <LogIn className="w-4 h-4 mr-2" />
                    Join Contest
                  </Link>
                </Button>
              ) : contest.status === "ended" ? (
                <Button
                  className="w-full border-0"
                  variant={contest.status === "ended" ? "destructive" : "default"}
                  asChild
                >
                  <Link href={`/contest/${contest.slug}`}>
                    <Eye className="w-4 h-4 mr-2" />View Results
                  </Link>
                </Button>
              ) : (
                <Button
                  className="w-full border-0 opacity-60 cursor-not-allowed"
                  disabled
                >
                  Coming Soon...
                </Button>
              )}
            </Card>
          ))}
        </div>

        {contests.length === 0 && (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground">
              No contests available at the moment
            </p>
            {(session?.user?.role === Role.ADMIN || session?.user?.role === Role.STAFF) &&
              <Button className="mt-4" variant="outline">Create Contest</Button>
            }
          </Card>
        )}
      </div>
    </main >
  );
}
