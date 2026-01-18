import { Button } from "@/components/ui/button"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

import Link from "next/link"

interface Problem {
    id: number;
    title: string;
    topic: string;
    participants: number;
    success: number;
    difficulty: string;
}

function ProblemItem({ problem, className, order }: { problem: Problem, className?: string, order: number }) {
  return (
    <Link href={"/problems/" + problem.title.replace(/\s+/g, '-').toLowerCase()}>
      <Item className={className} variant={"default"} size={'xs'}>
        <ItemContent className="flex-row justify-between items-center">
          <div className="flex flex-6/7">
            <ItemTitle className="line-clamp-1">
                {order}. {problem.title}
            </ItemTitle>
          </div>

          <div className="flex flex-1">
            <ItemDescription className="text-sm flex w-full justify-between gap-2">
              <span>
                {problem.success / problem.participants ? ((problem.success / problem.participants) * 100).toFixed(2) : '0.00'}%
              </span>
              <span className={`${problem.difficulty === 'Easy' ? 'text-green-400' : problem.difficulty === 'Med.' ? 'text-yellow-400' : 'text-red-400'} `}>
                {problem.difficulty}
              </span>
            </ItemDescription>
          </div>
        </ItemContent>
      </Item>
    </Link>
  )
}

export default ProblemItem;