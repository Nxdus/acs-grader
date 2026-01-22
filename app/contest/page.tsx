"use client";

import { SectionNavBar } from "@/components/sidebar/section-navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { useState } from "react";
import { Calendar, Clock, Users } from "lucide-react";

interface Contest {
  id: string;
  name: string;
  iamgeUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  participantCount?: number;
  status: "active" | "upcoming" | "ended";
}

const mockContests: Contest[] = [
  {
    id: "1",
    name: "Programming Challenge 2024",
    description:
      "Test your competitive programming skills with challenging algorithmic problems",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-10",
    participantCount: 156,
    status: "active",
  },
  {
    id: "2",
    name: "Web Development Sprint",
    description: "Build modern web applications with the latest technologies",
    createdAt: "2024-02-01",
    updatedAt: "2024-02-10",
    participantCount: 89,
    status: "active",
  },
  {
    id: "3",
    name: "Data Structures & Algorithms",
    description: "Master fundamental data structures and algorithms",
    createdAt: "2024-03-01",
    updatedAt: "2024-03-10",
    participantCount: 203,
    status: "upcoming",
  },
  {
    id: "4",
    name: "Machine Learning Basics",
    description:
      "Introduction to machine learning concepts and implementations",
    createdAt: "2023-12-01",
    updatedAt: "2023-12-15",
    participantCount: 92,
    status: "ended",
  },
];

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

export default function page() {
  const [contests, setContests] = useState<Contest[]>(mockContests);

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
                    (sum, c) => sum + (c.participantCount || 0),
                    0,
                  )}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600/50" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {contests.map((contest) => (
            <Card
              key={contest.id}
              className="overflow-hidden hover:shadow-lg transition-shadow border-0 bg-linear-to-br from-background to-muted p-0"
            >
              <div className="h-40 bg-linear-to-r from-primary/20 to-primary/10 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="text-center">
                  {contest.iamgeUrl ? (
                    <Image
                      src={contest.iamgeUrl}
                      alt={contest.name}
                      width={100}
                      height={100}
                      className="w-24 h-24 object-cover rounded-full"
                    />
                  ) : (
                    <div className="text-4xl font-bold text-primary/30">
                      {contest.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {contest.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {contest.description || "No description available"}
                    </p>
                  </div>
                  <Badge className={`ml-2 ${getStatusColor(contest.status)}`}>
                    {getStatusLabel(contest.status)}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 py-2 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{contest.participantCount || 0} participants</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{contest.createdAt}</span>
                  </div>
                </div>

                <Button className="w-full" variant="default">
                  {contest.status === "ended" ? "View Results" : "Join Contest"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {contests.length === 0 && (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground mb-4">
              No contests available at the moment
            </p>
            <Button variant="outline">Create Contest</Button>
          </Card>
        )}
      </div>
    </main>
  );
}
