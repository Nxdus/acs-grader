"use client";

import { SectionNavBar } from "@/components/sidebar/section-navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User } from "@/generated/prisma/client";
import { useState } from "react";

const mockData: User[] = [
  { id: "1", name: "Alice", attended: 10, score: 95 },
  { id: "2", name: "Bob", attended: 8, score: 88 },
  { id: "3", name: "Charlie", attended: 9, score: 92 },
  { id: "4", name: "David", attended: 7, score: 85 },
  { id: "5", name: "Eve", attended: 10, score: 98 },
];

export default function page() {
  const [rankings, setRankings] = useState<User[]>(mockData);
  const [totalParticipants, setTotalParticipants] = useState(0);

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar items={[{ label: "Ranking" }]} />

      <div className="container my-7 mx-auto px-4">
        <div>
          <h1 className="text-xl">Ranking</h1>
          <span className="text-muted-foreground text-sm">
            Total Participants: {totalParticipants}
          </span>
        </div>

        <div className="mt-8 mb-8">
          <div className="flex justify-center items-end gap-4 h-64">
            {/* 2nd Place */}
            {rankings.length > 1 && (
              <div className="flex flex-col items-center">
                <Avatar className="h-12 w-12 rounded-full">
                  <AvatarImage
                    src={rankings[1].image ? rankings[1].image : "/avatar.png"}
                    alt={rankings[1].name}
                  />
                  <AvatarFallback className="rounded-full">NX</AvatarFallback>
                </Avatar>
                <div className="mt-2 w-20 h-32 bg-slate-400 rounded-t-lg flex flex-col items-center justify-center text-white shadow-lg">
                  <div className="text-3xl font-bold">🥈</div>
                  <div className="text-sm font-semibold mt-2">
                    {rankings[1].name}
                  </div>
                  <div className="text-xs">{rankings[1].score}</div>
                </div>
                <div className="text-center mt-2 text-sm font-semibold">
                  2nd
                </div>
              </div>
            )}

            {/* 1st Place */}
            {rankings.length > 0 && (
              <div className="flex flex-col items-center">
                <Avatar className="h-12 w-12 rounded-full">
                  <AvatarImage
                    src={rankings[0].image ? rankings[0].image : "/avatar.png"}
                    alt={rankings[0].name}
                  />
                  <AvatarFallback className="rounded-full">NX</AvatarFallback>
                </Avatar>
                <div className="mt-2 w-20 h-48 bg-yellow-500 rounded-t-lg flex flex-col items-center justify-center text-white shadow-lg">
                  <div className="text-4xl font-bold">🥇</div>
                  <div className="text-sm font-semibold mt-2">
                    {rankings[0].name}
                  </div>
                  <div className="text-xs">{rankings[0].score}</div>
                </div>
                <div className="text-center mt-2 text-sm font-semibold">
                  1st
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {rankings.length > 2 && (
              <div className="flex flex-col items-center">
                <Avatar className="h-12 w-12 rounded-full">
                  <AvatarImage
                    src={rankings[2].image ? rankings[2].image : "/avatar.png"}
                    alt={rankings[2].name}
                  />
                  <AvatarFallback className="rounded-full">NX</AvatarFallback>
                </Avatar>
                <div className="mt-2 w-20 h-24 bg-orange-500 rounded-t-lg flex flex-col items-center justify-center text-white shadow-lg">
                  <div className="text-3xl font-bold">🥉</div>
                  <div className="text-sm font-semibold mt-2">
                    {rankings[2].name}
                  </div>
                  <div className="text-xs">{rankings[2].score}</div>
                </div>
                <div className="text-center mt-2 text-sm font-semibold">
                  3rd
                </div>
              </div>
            )}
          </div>
        </div>

        <Table className="mt-4">
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow>
              <TableHead className="w-25">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Attended</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.map((r, index) => (
              <TableRow
                className={index % 2 == 0 ? "bg-muted" : "bg-background"}
                key={r.id}
              >
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-right">{r.attended}</TableCell>
                <TableCell className="text-right">{r.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
