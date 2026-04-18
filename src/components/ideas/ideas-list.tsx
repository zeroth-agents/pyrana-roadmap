"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getPillarSlug, getMonogram } from "@/lib/pillar-utils";

interface Pillar {
  id: string;
  name: string;
}

interface IdeaData {
  id: string;
  title: string;
  body: string;
  authorName: string;
  pillarId: string | null;
  status: string;
  priorityScore: number | null;
  score: number;
  userVote: 1 | -1 | 0;
  commentCount: number;
  createdAt: string;
}

interface IdeasListProps {
  ideas: IdeaData[];
  pillars: Pillar[];
  onSelectIdea: (id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

export function IdeasList({ ideas, pillars, onSelectIdea }: IdeasListProps) {
  return (
    <div className="border-2 border-border bg-card shadow-brut-md overflow-hidden">
      {/* Header bar */}
      <div className="bg-ink text-cream px-4 py-2.5 flex justify-between items-baseline">
        <span className="font-display text-[18px] tracking-[-0.02em]">
          IDEAS · ALL
        </span>
        <span className="font-mono text-[10px] tracking-[0.1em]">
          {ideas.length} {ideas.length === 1 ? "ROW" : "ROWS"}
        </span>
      </div>

      {ideas.length === 0 ? (
        <div className="flex h-40 items-center justify-center bg-muted">
          <p className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
            No ideas match these filters
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Pillar</TableHead>
              <TableHead className="text-center w-16">Score</TableHead>
              <TableHead className="text-center w-20">Comments</TableHead>
              <TableHead className="text-center w-20">Priority</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ideas.map((idea) => {
              const pillar = pillars.find((p) => p.id === idea.pillarId);
              const pillarSlug = getPillarSlug(pillar?.name);
              const scoreTone =
                idea.score > 0
                  ? "text-foreground"
                  : idea.score < 0
                    ? "text-destructive"
                    : "text-muted-foreground";
              return (
                <TableRow
                  key={idea.id}
                  className="cursor-pointer"
                  onClick={() => onSelectIdea(idea.id)}
                >
                  <TableCell>
                    <span className="font-semibold hover:underline">{idea.title}</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center border-[1.5px] border-ink bg-pillar-pf text-ink font-display text-[9px]">
                        {getMonogram(idea.authorName)}
                      </span>
                      <span className="text-[12px]">{idea.authorName}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {pillar ? (
                      <span
                        className={cn(
                          "border-[1.5px] border-ink text-ink font-display text-[9px] tracking-[0.12em] uppercase px-1.5 py-0.5 inline-block",
                          `bg-pillar-${pillarSlug}`
                        )}
                      >
                        {pillar.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-center font-display text-[14px] tracking-[-0.03em]", scoreTone)}>
                    {idea.score > 0 ? `+${idea.score}` : idea.score}
                  </TableCell>
                  <TableCell className="text-center font-mono text-[11px]">
                    {idea.commentCount}
                  </TableCell>
                  <TableCell className="text-center">
                    {idea.priorityScore != null ? (
                      <span className="border-[1.5px] border-ink bg-pillar-ai text-ink font-display text-[10px] tracking-[0.1em] px-1.5 py-0.5 inline-block">
                        P{idea.priorityScore}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-display text-[9px] tracking-[0.14em] uppercase px-1.5 py-0.5 inline-block border-[1.5px]",
                        idea.status === "promoted" && "bg-pillar-bx border-ink text-ink",
                        idea.status === "archived" && "bg-transparent border-dashed border-border text-muted-foreground",
                        idea.status === "open" && "bg-background border-ink text-ink"
                      )}
                    >
                      {idea.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {formatDate(idea.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
