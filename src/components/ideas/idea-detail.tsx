"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommentThread } from "@/components/comment-thread";
import { AssigneeSelect } from "@/components/assignee-select";
import { VoteButton } from "./vote-button";
import { PromoteDialog } from "./promote-dialog";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Voter {
  userId: string;
  userName: string;
}

interface IdeaDetailData {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  pillarId: string | null;
  status: string;
  priorityScore: number | null;
  promotedInitiativeId: string | null;
  linearProjectId: string | null;
  voteCount: number;
  voters: Voter[];
  userVoted: boolean;
  createdAt: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

interface Pillar {
  id: string;
  name: string;
}

interface IdeaDetailProps {
  ideaId: string;
  pillars: Pillar[];
  onClose: () => void;
  onUpdate: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function IdeaDetail({ ideaId, pillars, onClose, onUpdate }: IdeaDetailProps) {
  const [idea, setIdea] = useState<IdeaDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoteOpen, setPromoteOpen] = useState(false);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetch(`/api/ideas/${ideaId}`)
      .then((r) => r.json())
      .then((data) => {
        setIdea(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ideaId]);

  async function handlePriorityChange(value: string | null) {
    if (!idea || !value) return;
    const score = value === "none" ? null : parseInt(value, 10);
    await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priorityScore: score }),
    });
    setIdea((prev) => prev ? { ...prev, priorityScore: score } : prev);
    onUpdate();
  }

  async function handleStatusChange(newStatus: "open" | "archived") {
    if (!idea) return;
    const res = await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setIdea((prev) => prev ? { ...prev, status: newStatus } : prev);
      onUpdate();
    }
  }

  async function handlePromote(pillarId: string, lane: string) {
    if (!idea) return;
    const res = await fetch(`/api/ideas/${idea.id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pillarId, lane }),
    });
    if (res.ok) {
      const data = await res.json();
      setIdea((prev) =>
        prev
          ? {
              ...prev,
              status: "promoted",
              promotedInitiativeId: data.initiative.id,
              linearProjectId: data.idea.linearProjectId,
            }
          : prev
      );
      onUpdate();
    }
  }

  const pillarName = idea
    ? pillars.find((p) => p.id === idea.pillarId)?.name
    : null;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="data-[side=right]:w-[780px] data-[side=right]:sm:max-w-none overflow-y-auto">
        {loading || !idea ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            <SheetHeader className="px-7 pt-5 pb-0">
              <div className="mb-2 flex items-center gap-2">
                {pillarName && (
                  <Badge variant="outline" className="text-[10px]">
                    {pillarName}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={
                    idea.status === "promoted"
                      ? "bg-green-500/10 text-green-600 border-0 text-[10px]"
                      : idea.status === "archived"
                        ? "bg-muted text-muted-foreground border-0 text-[10px]"
                        : "bg-primary/10 text-primary border-0 text-[10px]"
                  }
                >
                  {idea.status === "open"
                    ? "● Open"
                    : idea.status === "promoted"
                      ? "✓ Promoted"
                      : "Archived"}
                </Badge>
              </div>
              <SheetTitle className="text-xl">{idea.title}</SheetTitle>
            </SheetHeader>

            <div className="mt-2 space-y-5 px-7 pb-7">
              {/* Author + date */}
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                  {getInitials(idea.authorName)}
                </div>
                <span className="text-sm text-muted-foreground">
                  {idea.authorName}
                </span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(idea.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Vote + Priority row */}
              <div className="flex items-center gap-3">
                <VoteButton
                  ideaId={idea.id}
                  initialVoted={idea.userVoted}
                  initialCount={idea.voteCount}
                  onVoteChange={(voted, count) =>
                    setIdea((prev) =>
                      prev ? { ...prev, userVoted: voted, voteCount: count } : prev
                    )
                  }
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Priority:</span>
                  <Select
                    value={idea.priorityScore?.toString() ?? "none"}
                    onValueChange={handlePriorityChange}
                  >
                    <SelectTrigger className="h-7 w-20 text-xs">
                      <SelectValue placeholder="—">
                        {(value: string) => value === "none" ? "—" : `P${value}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          P{n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Assignee:</span>
                <AssigneeSelect
                  value={idea.assigneeId ?? null}
                  onChange={async (userId) => {
                    await fetch(`/api/ideas/${idea.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ assigneeId: userId }),
                    });
                    setIdea((prev) => prev ? { ...prev, assigneeId: userId } : prev);
                    onUpdate();
                  }}
                />
              </div>

              {/* Voters */}
              {idea.voters.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Voted by:</span>
                  <div className="flex -space-x-1">
                    {idea.voters.slice(0, 5).map((v) => (
                      <div
                        key={v.userId}
                        title={v.userName}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[7px] font-semibold text-primary-foreground ring-2 ring-background"
                      >
                        {getInitials(v.userName)}
                      </div>
                    ))}
                  </div>
                  {idea.voters.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{idea.voters.length - 5} more
                    </span>
                  )}
                </div>
              )}

              <Separator />

              {/* Markdown body */}
              <div className="prose prose-sm prose-muted max-w-none dark:prose-invert [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h4]:text-sm [&_p]:text-sm [&_li]:text-sm">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ children, href, ...props }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                        {children}
                      </a>
                    ),
                  }}
                >
                  {idea.body}
                </Markdown>
              </div>

              <Separator />

              {/* Actions */}
              {idea.status === "open" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPromoteOpen(true)}
                    className="flex-1"
                  >
                    🚀 Promote to Linear Project
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange("archived")}
                  >
                    Archive
                  </Button>
                </div>
              )}

              {idea.status === "archived" && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("open")}
                  className="w-full"
                >
                  Reopen Idea
                </Button>
              )}

              {/* Promoted link */}
              {idea.status === "promoted" && idea.linearProjectId && (
                <div className="rounded-lg border bg-green-500/5 p-3">
                  <p className="text-sm text-green-600">
                    ✓ Promoted to Linear project
                  </p>
                </div>
              )}

              <Separator />

              {/* Comments */}
              <CommentThread targetType="idea" targetId={idea.id} />
            </div>

            <PromoteDialog
              open={promoteOpen}
              onClose={() => setPromoteOpen(false)}
              onPromote={handlePromote}
              pillars={pillars}
              defaultPillarId={idea.pillarId}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
