"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface VoteClusterProps {
  ideaId: string;
  initialUserVote: 1 | -1 | 0;
  initialScore: number;
  onChange?: (userVote: 1 | -1 | 0, score: number) => void;
}

export function VoteCluster({
  ideaId,
  initialUserVote,
  initialScore,
  onChange,
}: VoteClusterProps) {
  const [userVote, setUserVote] = useState<1 | -1 | 0>(initialUserVote);
  const [score, setScore] = useState(initialScore);
  const [loading, setLoading] = useState(false);

  async function submit(value: 1 | -1, e: React.MouseEvent) {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);

    const previousVote = userVote;
    const previousScore = score;
    const nextVote: 1 | -1 | 0 = userVote === value ? 0 : value;
    const delta = nextVote - userVote;
    const nextScore = score + delta;

    setUserVote(nextVote);
    setScore(nextScore);

    try {
      const res = await fetch(`/api/ideas/${ideaId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setUserVote(body.userVote);
      setScore(body.score);
      onChange?.(body.userVote, body.score);
    } catch {
      setUserVote(previousVote);
      setScore(previousScore);
    } finally {
      setLoading(false);
    }
  }

  const scoreTone =
    score > 0 ? "text-foreground" : score < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "self-stretch border-2 border-border bg-background w-[38px] grid grid-rows-[auto_1fr_auto] items-stretch font-display select-none",
        loading && "opacity-50"
      )}
    >
      <button
        type="button"
        onClick={(e) => submit(1, e)}
        aria-label={userVote === 1 ? "Remove upvote" : "Upvote"}
        aria-pressed={userVote === 1}
        disabled={loading}
        className={cn(
          "block w-full border-b-2 border-border py-1 text-[12px] text-ink",
          userVote === 1 ? "bg-pillar-bx" : "bg-pillar-ai"
        )}
      >
        ▲
      </button>
      <span
        className={cn(
          "flex items-center justify-center text-[16px] tracking-[-0.04em] leading-none",
          scoreTone
        )}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={(e) => submit(-1, e)}
        aria-label={userVote === -1 ? "Remove downvote" : "Downvote"}
        aria-pressed={userVote === -1}
        disabled={loading}
        className={cn(
          "block w-full border-t-2 border-border py-1 text-[12px]",
          userVote === -1 ? "bg-destructive/30" : "bg-muted"
        )}
      >
        ▼
      </button>
    </div>
  );
}

// Backwards export name so external imports can be renamed in a separate task.
export const VoteButton = VoteCluster;
