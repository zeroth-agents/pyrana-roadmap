"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommentThread } from "@/components/comment-thread";
import { AttachmentSection } from "@/components/attachments/attachment-section";
import { AssigneeSelect } from "@/components/assignee-select";
import { VoteButton } from "./vote-button";
import { PromoteDialog } from "./promote-dialog";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPillarSlug, getMonogram } from "@/lib/pillar-utils";
import { cn } from "@/lib/utils";

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

function SectionHeader({
  num,
  label,
  detail,
}: {
  num: string;
  label: string;
  detail?: string;
}) {
  return (
    <div className="mt-7">
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[11px] tracking-[0.08em] bg-ink text-cream px-1.5 py-0.5">
          §{num}
        </span>
        <span className="font-display text-[16px] tracking-[-0.02em] uppercase">
          {label}
        </span>
        {detail && (
          <span className="ml-auto text-[9px] tracking-[0.18em] opacity-60 uppercase">
            {detail}
          </span>
        )}
      </div>
      <div className="h-[2px] bg-ink mt-1" />
    </div>
  );
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

  const pillar = idea ? pillars.find((p) => p.id === idea.pillarId) : null;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="data-[side=right]:w-[780px] data-[side=right]:sm:max-w-none overflow-y-auto">
        {loading || !idea ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            <SheetHeader className="px-7 pt-6 pb-0">
              <div className="font-display text-[10px] tracking-[0.22em] uppercase bg-ink text-cream px-2 py-0.5 self-start mb-2">
                IDEA · {idea.status.toUpperCase()}
                {pillar && ` · ${pillar.name.toUpperCase()}`}
              </div>
              <SheetTitle className="font-display text-[32px] leading-[0.95] tracking-[-0.035em] pb-3 border-b-[3px] border-ink">
                {idea.title}
              </SheetTitle>
            </SheetHeader>

            {/* Vote row */}
            <div className="flex items-center gap-5 mt-5 px-7">
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
              <div>
                <div className="font-display text-[10px] tracking-[0.18em] uppercase opacity-60">
                  Author · Submitted
                </div>
                <div className="font-mono text-[12px] mt-0.5 flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center border-[1.5px] border-ink bg-pillar-pf font-display text-[9px]">
                    {getMonogram(idea.authorName)}
                  </span>
                  {idea.authorName} · {new Date(idea.createdAt).toLocaleDateString()}
                </div>
              </div>
              {idea.priorityScore != null && (
                <div className="ml-auto border-2 border-ink bg-pillar-ai px-2.5 py-1 shadow-brut-sm">
                  <div className="font-display text-[9px] tracking-[0.18em] uppercase opacity-60">Priority</div>
                  <div className="font-display text-[20px] tracking-[-0.03em] leading-none">P{idea.priorityScore}</div>
                </div>
              )}
            </div>

            <div className="space-y-0 pb-7">

              {/* §01 Body */}
              <div className="px-7">
                <SectionHeader num="01" label="Body" />
                <div className="mt-3 font-serif italic text-[15px] leading-[1.35] bg-cream-2 border-2 border-ink p-3.5 shadow-brut-sm prose-neutral max-w-none">
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ children, href, ...props }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 hover:decoration-primary" {...props}>
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {idea.body}
                  </Markdown>
                </div>
              </div>

              {/* §02 Properties */}
              <div className="px-7">
                <SectionHeader num="02" label="Properties" />
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {/* Priority select */}
                  <Select
                    value={idea.priorityScore?.toString() ?? "none"}
                    onValueChange={handlePriorityChange}
                  >
                    <SelectTrigger className="h-auto border-2 border-ink px-2.5 py-1 font-bold text-[11px] tracking-[0.04em] shadow-[2px_2px_0_var(--ink)] w-auto gap-1.5 bg-cream">
                      <span className="text-[8px] tracking-[0.2em] uppercase opacity-55 mr-0.5">Priority</span>
                      <SelectValue>
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

                  {/* Pillar select */}
                  <Select
                    value={idea.pillarId ?? "none"}
                    onValueChange={async (v) => {
                      const newPillarId = v === "none" ? null : v;
                      await fetch(`/api/ideas/${idea.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pillarId: newPillarId }),
                      });
                      setIdea((prev) => prev ? { ...prev, pillarId: newPillarId } : prev);
                      onUpdate();
                    }}
                  >
                    <SelectTrigger className={cn(
                      "h-auto border-2 border-ink px-2.5 py-1 font-bold text-[11px] tracking-[0.04em] shadow-[2px_2px_0_var(--ink)] w-auto gap-1.5",
                      pillar ? `bg-pillar-${getPillarSlug(pillar.name)}` : "bg-cream"
                    )}>
                      <span className="text-[8px] tracking-[0.2em] uppercase opacity-55 mr-0.5">Pillar</span>
                      <SelectValue placeholder="Choose pillar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No pillar</SelectItem>
                      {pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>

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
                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-display text-[9px] tracking-[0.18em] uppercase opacity-60">Voted by</span>
                    <div className="flex -space-x-1">
                      {idea.voters.slice(0, 5).map((v) => (
                        <div
                          key={v.userId}
                          title={v.userName}
                          className="flex h-5 w-5 items-center justify-center border-[1.5px] border-ink bg-pillar-ac font-display text-[7px]"
                        >
                          {getMonogram(v.userName)}
                        </div>
                      ))}
                    </div>
                    {idea.voters.length > 5 && (
                      <span className="font-mono text-[10px] opacity-60">
                        +{idea.voters.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* §03 Attachments */}
              <div className="px-7">
                <SectionHeader num="03" label="Attachments" />
                <div className="mt-3">
                  <AttachmentSection
                    targetType="idea"
                    targetId={idea.id}
                    readOnly={idea.status !== "open"}
                  />
                </div>
              </div>

              {/* §04 Comments */}
              <div className="px-7">
                <SectionHeader num="04" label="Comments" />
                <div className="mt-3">
                  <CommentThread targetType="idea" targetId={idea.id} />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 px-7 flex gap-2.5">
                {idea.status === "open" && (
                  <>
                    <Button onClick={() => setPromoteOpen(true)} className="shadow-brut-accent">
                      PROMOTE TO INITIATIVE →
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange("archived")}
                    >
                      ARCHIVE
                    </Button>
                  </>
                )}

                {idea.status === "archived" && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange("open")}
                    className="w-full"
                  >
                    REOPEN IDEA
                  </Button>
                )}

                {idea.status === "promoted" && idea.linearProjectId && (
                  <div className="border-2 border-ink bg-pillar-bx px-3 py-2 shadow-brut-sm">
                    <p className="font-display text-[11px] tracking-[0.08em] uppercase">
                      ✓ Promoted to Linear project
                    </p>
                  </div>
                )}
              </div>

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
