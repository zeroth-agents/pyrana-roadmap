"use client";

import { Badge } from "@/components/ui/badge";
import { VoteButton } from "./vote-button";
import { cn } from "@/lib/utils";

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
}

interface IdeaCardProps {
  idea: IdeaCardData;
  pillars: Pillar[];
  onClick: () => void;
  onVoteChange?: (voted: boolean, count: number) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function IdeaCard({ idea, pillars, onClick, onVoteChange }: IdeaCardProps) {
  const pillar = pillars.find((p) => p.id === idea.pillarId);
  const isPromoted = idea.status === "promoted";
  const bodyPreview = idea.body.slice(0, 120).replace(/[#*_`>\n]/g, "") + (idea.body.length > 120 ? "..." : "");

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-xl border bg-card p-4 transition-colors hover:border-primary/40",
        isPromoted && "opacity-60"
      )}
    >
      {/* Top row: pillar tag + vote */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {pillar && (
            <Badge variant="outline" className="text-[10px]">
              {pillar.name}
            </Badge>
          )}
          {isPromoted && (
            <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">
              ✓ Promoted
            </Badge>
          )}
        </div>
        <VoteButton
          ideaId={idea.id}
          initialVoted={idea.userVoted}
          initialCount={idea.voteCount}
          compact
          onVoteChange={onVoteChange}
        />
      </div>

      {/* Title */}
      <h3 className="mb-2 text-sm font-semibold leading-tight">{idea.title}</h3>

      {/* Body preview */}
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {bodyPreview}
      </p>

      {/* Footer: author + meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[8px] font-semibold text-primary-foreground">
            {getInitials(idea.authorName)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {idea.authorName} · {timeAgo(idea.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            💬 {idea.commentCount}
          </span>
          {idea.priorityScore && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-0">
              P{idea.priorityScore}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
