"use client";

import { SectionNavBar } from "@/components/sidebar/section-navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/generated/prisma/client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChessQueen, ChessRook, Crown } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export default function Page() {
  const [rankings, setRankings] = useState<User[]>([]);
  const { data: session } = useSession();
  const totalParticipants = rankings.length;
  
  const userRank = rankings.findIndex(u => u.id === session?.user?.id);
  const userRankData = userRank >= 0 ? rankings[userRank] : null;

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await fetch("/api/rankings");
        if (!response.ok) {
          throw new Error("Failed to fetch rankings");
        }
        const data: User[] = await response.json();
        const sorted = data.sort((a, b) => (b.score || 0) - (a.score || 0));
        setRankings(sorted);
      } catch (error) {
        console.error("Error fetching rankings:", error);
      }
    };

    fetchRankings();
  }, []);

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar items={[{ label: "Ranking" }]} />

      <div className="container my-7 mx-auto px-4">
        <div>
          <h1 className="text-xl font-bold">Ranking</h1>
          <span className="text-muted-foreground text-sm">
            Total Participants: {totalParticipants}
          </span>
        </div>

        {/* Personal Ranking Card */}
        {userRankData && userRank >= 0 && (
          <div className="mt-6 px-6 py-2 border-2 border-blue-500 bg-blue-400/10 shadow-lg shadow-blue-500/20 dark:bg-blue-500/5 dark:shadow-blue-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center font-bold text-2xl text-blue-500">
                  {userRank + 1}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={userRankData.image ? userRankData.image : "/avatar.png"}
                    alt={userRankData.name}
                  />
                  <AvatarFallback>{userRankData.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-base">{userRankData.name} (You)</div>
                  <div className="text-sm text-muted-foreground">Your Ranking</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userRankData.score}</div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Global Rankings</h2>
        </div>

        <div className="mt-8 flex flex-col justify-center items-center gap-4 perspective">
          {rankings.map((user, index) => (
            <div
              key={user.id}
              className={cn(
                "flex items-center justify-between border-2 transition-all",
                index === 0 ? "w-full p-8 bg-linear-to-br from-yellow-300/30 to-yellow-500/10 border-yellow-500 shadow-[0_20px_25px_-5px_rgba(234,179,8,0.4),0_10px_10px_-5px_rgba(234,179,8,0.2)] dark:shadow-[0_20px_25px_-5px_rgba(234,179,8,0.2)] transform hover:scale-105 hover:shadow-[0_25px_50px_-12px_rgba(234,179,8,0.5)]" :
                  index === 1 ? "w-[95%] p-7 bg-linear-to-br from-gray-300/30 to-gray-500/10 border-gray-400 shadow-[0_15px_20px_-5px_rgba(156,163,175,0.3),0_8px_8px_-4px_rgba(156,163,175,0.15)] dark:shadow-[0_15px_20px_-5px_rgba(156,163,175,0.15)] transform hover:scale-103 hover:shadow-[0_20px_40px_-8px_rgba(156,163,175,0.3)]" :
                    index === 2 ? "mb-4 w-[90%] p-6 bg-linear-to-br from-orange-300/30 to-orange-500/10 border-orange-500 shadow-[0_12px_15px_-3px_rgba(234,88,12,0.3),0_6px_6px_-3px_rgba(234,88,12,0.15)] dark:shadow-[0_12px_15px_-3px_rgba(234,88,12,0.15)] transform hover:scale-102 hover:shadow-[0_15px_30px_-6px_rgba(234,88,12,0.3)]" :
                      "w-[85%] p-4 bg-muted border-border"
              )}
              style={index < 3 ? {
                transform: `translateY(${index === 0 ? 0 : index === 1 ? 8 : 12}px) perspective(1000px)`,
              } : undefined}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center font-bold w-10 h-10 text-lg">
                  {index === 0 ? <Crown className="text-yellow-500 drop-shadow-lg" size={48} /> : index === 1 ? <ChessQueen className="text-gray-400 drop-shadow-lg" size={36} /> : index === 2 ? <ChessRook className="text-orange-500 drop-shadow-lg" size={24} /> : index + 1}
                </div>
                <Avatar className={cn(
                  "ring-2",
                  index === 0 ? "h-16 w-16 ring-yellow-500/50" :
                    index === 1 ? "h-14 w-14 ring-gray-400/50" :
                      index === 2 ? "h-12 w-12 ring-orange-500/50" :
                        "ring-0 h-10 w-10"
                )}>
                  <AvatarImage
                    src={user.image ? user.image : "/avatar.png"}
                    alt={user.name}
                  />
                  <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className={cn("font-semibold",
                    index === 0 ? "text-lg" :
                      index === 1 ? "text-base" :
                        index === 2 ? "text-base" :
                          "text-sm"
                  )}>{user.name} {user.id === session?.user?.id ? "(You)" : ""}</div>
                </div>
              </div>
              <div className={cn(
                "font-bold w-10 h-10 flex items-center justify-center",
                index === 0 ? "text-4xl text-yellow-600 dark:text-yellow-400 drop-shadow-lg" :
                  index === 1 ? "text-3xl text-gray-600 dark:text-gray-300 drop-shadow-lg" :
                    index === 2 ? "text-2xl text-orange-600 dark:text-orange-400 drop-shadow-lg" :
                      "text-lg"
              )}>{user.score}</div>
            </div>
          ))}
        </div>
      </div>
    </main >
  );
}
