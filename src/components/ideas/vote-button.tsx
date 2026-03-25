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
  compact = false,
  onVoteChange,
}: VoteButtonProps) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [submitting, setSubmitting] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/vote`, {
        method: "POST",
      });
      const data = await res.json();
      setVoted(data.voted);
      setCount(data.voteCount);
      onVoteChange?.(data.voted, data.voteCount);
    } catch (err) {
      console.error("Vote failed:", err);
    }
    setSubmitting(false);
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={submitting}
        className={cn(
          "flex items-center gap-1 text-sm transition-colors",
          voted
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-primary"
        )}
      >
        <span>▲</span>
        <span>{count}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={submitting}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        voted
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-primary"
      )}
    >
      <span>▲</span>
      <span>Upvote · {count}</span>
    </button>
  );
}
