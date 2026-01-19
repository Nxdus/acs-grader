"use client";

import { SectionNavBar } from "@/components/sidebar/section-navbar";
import { Badge } from "@/components/ui/badge";
import { Item, ItemGroup } from "@/components/ui/item";
import Image from "next/image";
import { useState } from "react";

interface Contest {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const mockContests: Contest[] = [
  {
    id: "1",
    name: "Contest A",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-10"),
  },
  {
    id: "2",
    name: "Contest B",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-10"),
  },
];

export default function page() {
  const [contests, setContests] = useState<Contest[]>(mockContests);

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar items={[{ label: "Contest" }]} />

      <div className="container my-7 mx-auto px-4">
        <div>
          <h1 className="text-xl">All Contests</h1>
        </div>
        <ItemGroup className="mt-4 gap-1">
          {contests.map((contest) => (
            <Item
              className="p-0 pr-6 bg-muted hover:bg-primary-foreground border-0"
              key={contest.id}
              title={contest.name}
            >
              <div className="flex justify-center items-center w-30 h-20 bg-gray-200">
                <span className="text-black">Some Image</span>
              </div>
              <div className="flex flex-1 flex-col">
                <h2 className="text-sm">{contest.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {contest.createdAt.toDateString()}
                </span>
              </div>
              <Badge className="bg-green-400">active</Badge>
            </Item>
          ))}
        </ItemGroup>
      </div>
    </main>
  );
}
