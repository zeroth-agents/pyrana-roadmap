"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  ideaId: string;
  initialVoted: boolean;
  initialCount: number;
  compact?: boolean;
  onVoteChange?: (voted: boolean, count: number) => void;
}

export function VoteButton({
  ideaId,
  initialVoted,
  initialCount,
  compact: _compact,
  onVoteChange,
}: VoteButtonProps) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const optimisticVoted = !voted;
    const optimisticCount = count + (optimisticVoted ? 1 : -1);
    setVoted(optimisticVoted);
    setCount(optimisticCount);
    try {
      const res = await fetch(
        `/api/ideas/${ideaId}/${optimisticVoted ? "vote" : "unvote"}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error();
      onVoteChange?.(optimisticVoted, optimisticCount);
    } catch {
      setVoted(voted);
      setCount(count);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={voted ? "Remove vote" : "Vote for this idea"}
      aria-pressed={voted}
      disabled={loading}
      className={cn(
        "border-2 border-ink bg-cream w-[38px] flex flex-col items-stretch justify-start font-display select-none",
        loading && "opacity-50"
      )}
    >
      <span
        className={cn(
          "block w-full border-b-2 border-ink py-0.5 text-[12px]",
          voted ? "bg-pillar-bx" : "bg-pillar-ai"
        )}
      >
        ▲
      </span>
      <span className="block py-1 text-[16px] tracking-[-0.04em] leading-none">
        {count}
      </span>
    </button>
  );
}
