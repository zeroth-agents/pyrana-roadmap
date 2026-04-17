"use client";

import { VoteButton } from "./vote-button";
import { cn } from "@/lib/utils";
import { getPillarSlug, getMonogram } from "@/lib/pillar-utils";

interface Pillar {
  id: string;
  name: string;
}

interface IdeaCardData {
  id: string;
  title: string;
  body: string;
  authorName: string;
  pillarId: string | null;
  status: string;
  priorityScore: number | null;
  voteCount: number;
  commentCount: number;
  userVoted: boolean;
  createdAt: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

interface IdeaCardProps {
  idea: IdeaCardData;
  pillars: Pillar[];
  onClick: () => void;
  onVoteChange?: (voted: boolean, count: number) => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}D AGO`;
  const weeks = Math.floor(days / 7);
  return `${weeks}W AGO`;
}

export function IdeaCard({ idea, pillars, onClick, onVoteChange }: IdeaCardProps) {
  const pillar = pillars.find((p) => p.id === idea.pillarId);
  const pillarSlug = getPillarSlug(pillar?.name);
  const isPromoted = idea.status === "promoted";
  const bodyPreview = idea.body.slice(0, 140).replace(/[#*_`>\n]/g, "") + (idea.body.length > 140 ? "..." : "");

  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer border-2 border-border shadow-brut-sm transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--shadow-color)] grid grid-cols-[auto_1fr] gap-2.5 p-3 relative",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        isPromoted ? "bg-pillar-bx" : "bg-muted"
      )}
    >
      {/* Vote stack */}
      <VoteButton
        ideaId={idea.id}
        initialVoted={idea.userVoted}
        initialCount={idea.voteCount}
        onVoteChange={onVoteChange}
      />

      {/* Body */}
      <div>
        {pillar && (
          <span
            className={cn(
              "inline-block border-[1.5px] border-border font-display text-[8px] tracking-[0.18em] uppercase px-1 py-0.5 mb-1",
              `bg-pillar-${pillarSlug}`
            )}
          >
            {pillar.name}
          </span>
        )}
        <h3 className="font-display text-[13px] leading-[1.2] tracking-[-0.01em] uppercase">
          {idea.title}
        </h3>
        <p className="text-[10px] leading-[1.3] opacity-70 mt-1">{bodyPreview}</p>
        <div className="flex items-center gap-1.5 mt-1.5 font-mono text-[9px] opacity-65">
          <span>{getMonogram(idea.authorName)} · {timeAgo(idea.createdAt)}</span>
          <span>·</span>
          <span>💬 {idea.commentCount}</span>
          {idea.priorityScore != null && (
            <span className="border-[1.5px] border-ink bg-pillar-ai font-display text-[9px] tracking-[0.1em] uppercase px-1 py-0 ml-auto text-ink">
              P{idea.priorityScore}
            </span>
          )}
        </div>
      </div>

      {/* Promoted stamp */}
      {isPromoted && (
        <span
          aria-hidden
          className="absolute top-1 right-0 font-display text-[9px] tracking-[0.16em] bg-ink text-cream px-1.5 py-0.5"
          style={{ transform: "rotate(2deg)" }}
        >
          PROMOTED
        </span>
      )}
    </div>
  );
}
