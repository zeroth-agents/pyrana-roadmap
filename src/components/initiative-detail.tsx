"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CommentThread } from "./comment-thread";
import { AttachmentSection } from "./attachments/attachment-section";
import { AssigneeSelect } from "./assignee-select";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPillarSlug, getMonogram } from "@/lib/pillar-utils";
import { cn } from "@/lib/utils";
import { ProseMarkdown } from "@/lib/markdown";

interface Milestone {
  name: string;
  description: string;
  progress: number;
  sortOrder: number;
}

interface Initiative {
  id: string;
  title: string;
  description: string;
  content: string;
  milestones: string;
  why: string;
  lane: string;
  size: string;
  pillarId: string;
  linearProjectId?: string | null;
  linearProjectUrl?: string | null;
  linearProjectLead?: string | null;
  linearSyncedAt?: string | null;
  issueCountTotal?: number;
  issueCountDone?: number;
  dependsOn: string[];
  assigneeId?: string | null;
  assigneeName?: string | null;
}

interface Pillar {
  id: string;
  name: string;
}

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  status: string;
  statusType: string;
  assigneeName?: string;
  assigneeId?: string;
  priority: number;
  priorityLabel: string;
  labels: string[];
  url: string;
}

interface TeamState {
  id: string;
  name: string;
  type: string;
}

interface TeamMember {
  id: string;
  name: string;
}

interface InitiativeDetailProps {
  initiative: Initiative;
  pillars: Pillar[];
  onClose: () => void;
  onUpdate: () => void;
}

const LANE_LABELS: Record<string, string> = {
  now: "Now",
  next: "Next",
  backlog: "Backlog",
  done: "Done",
};

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

export function InitiativeDetail({
  initiative,
  pillars,
  onClose,
  onUpdate,
}: InitiativeDetailProps) {
  const [lane, setLane] = useState(initiative.lane);
  const [assigneeId, setAssigneeId] = useState(initiative.assigneeId ?? null);
  const [rationale, setRationale] = useState(initiative.why);
  const [editingRationale, setEditingRationale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [teamStates, setTeamStates] = useState<TeamState[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const pillarName = pillars.find((p) => p.id === initiative.pillarId)?.name ?? "Unknown";
  const total = initiative.issueCountTotal ?? 0;
  const done = initiative.issueCountDone ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  // Fetch issues and team data when panel opens
  useEffect(() => {
    if (!initiative.linearProjectId) return;

    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetch(`/api/projects/${initiative.linearProjectId}/issues`)
      .then((r) => r.json())
      .then(setIssues)
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch("/api/team/states").then((r) => r.json()).then(setTeamStates).catch(console.error);
    fetch("/api/team/members").then((r) => r.json()).then(setTeamMembers).catch(console.error);
  }, [initiative.linearProjectId]);

  async function handleSaveRationale() {
    setSaving(true);
    await fetch(`/api/initiatives/${initiative.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ why: rationale }),
    });
    setSaving(false);
    onUpdate();
  }

  async function handleCreateIssue() {
    if (!newIssueTitle.trim() || !initiative.linearProjectId) return;
    setCreatingIssue(true);
    try {
      await fetch(`/api/projects/${initiative.linearProjectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newIssueTitle }),
      });
      setNewIssueTitle("");
      // Re-fetch issues
      const updated = await fetch(`/api/projects/${initiative.linearProjectId}/issues`).then((r) => r.json());
      setIssues(updated);
    } catch (err) {
      console.error("Failed to create issue:", err);
    }
    setCreatingIssue(false);
  }

  async function handleUpdateIssue(issueId: string, updates: { stateId?: string; assigneeId?: string | null }) {
    try {
      await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      // Re-fetch issues to get updated state
      if (initiative.linearProjectId) {
        const updated = await fetch(`/api/projects/${initiative.linearProjectId}/issues`).then((r) => r.json());
        setIssues(updated);
      }
    } catch (err) {
      console.error("Failed to update issue:", err);
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="data-[side=right]:w-[780px] data-[side=right]:sm:max-w-none overflow-y-auto">
        <SheetHeader className="px-7 pt-6 pb-0">
          <div className="font-display text-[10px] tracking-[0.22em] uppercase bg-ink text-cream px-2 py-0.5 self-start mb-2">
            {pillarName.toUpperCase()} · {LANE_LABELS[lane]?.toUpperCase() ?? lane.toUpperCase()}
          </div>
          <SheetTitle className="font-display text-[32px] leading-[0.95] tracking-[-0.035em] pb-3 border-b-[3px] border-border">
            {initiative.title}
          </SheetTitle>
          {initiative.linearProjectId && (
            <div className="mt-2 font-mono text-[11px] border-2 border-border bg-muted px-2 py-1 shadow-brut-sm self-start">
              INIT-{initiative.id.slice(0, 6).toUpperCase()} · LIN
            </div>
          )}
        </SheetHeader>

        <div className="mt-2 space-y-6 px-7 pb-7">
          {/* Chip row */}
          <div className="flex flex-wrap gap-2.5">
            {/* Lane chip (ink filled) */}
            <Select
              value={lane}
              onValueChange={async (newLane: string | null) => {
                if (!newLane) return;
                setLane(newLane);
                await fetch(`/api/initiatives/${initiative.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ lane: newLane }),
                });
                onUpdate();
              }}
            >
              <SelectTrigger className="h-auto border-2 border-foreground bg-ink text-cream px-2.5 py-1 shadow-[2px_2px_0_var(--foreground)] font-bold text-[11px] tracking-[0.04em] w-auto gap-1.5">
                <span className="text-[8px] tracking-[0.2em] uppercase opacity-70 mr-0.5">Lane</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Pillar chip (color-filled) */}
            <div
              className={cn(
                "flex items-center gap-1.5 border-2 border-border px-2.5 py-1 font-bold text-[11px] tracking-[0.04em] shadow-[2px_2px_0_var(--shadow-color)] text-ink",
                `bg-pillar-${getPillarSlug(pillarName)}`
              )}
            >
              <span className="text-[8px] tracking-[0.2em] uppercase opacity-55 mr-0.5">Pillar</span>
              {pillarName}
            </div>

            {/* Size + issue count chip */}
            <div className="border-2 border-border bg-destructive px-2.5 py-1 font-bold text-[11px] tracking-[0.04em] shadow-[2px_2px_0_var(--shadow-color)] text-ink flex items-center gap-1.5">
              <span className="text-[8px] tracking-[0.2em] uppercase opacity-55 mr-0.5">Size</span>
              {initiative.size} · {total} issues
            </div>

            {/* Assignee */}
            <AssigneeSelect
              value={assigneeId}
              onChange={async (userId) => {
                setAssigneeId(userId);
                await fetch(`/api/initiatives/${initiative.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ assigneeId: userId }),
                });
                onUpdate();
              }}
            />
          </div>

          {/* Progress rail */}
          {total > 0 && (
            <div className="grid grid-cols-[1fr_auto] gap-5 items-center">
              <div className="h-5 border-2 border-border bg-muted overflow-hidden relative">
                <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="font-display text-[44px] leading-[0.9] tracking-[-0.05em] flex items-baseline gap-1">
                {progress}
                <span className="text-[22px]">%</span>
                <span className="text-[12px] tracking-[0.15em] opacity-60 ml-2">
                  {done} / {total} DONE
                </span>
              </div>
            </div>
          )}

          {/* Metadata row */}
          <div className="flex gap-3.5 font-mono text-[10px] tracking-[0.04em] items-center">
            {initiative.linearProjectUrl && (
              <a
                href={initiative.linearProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline-offset-2 hover:underline"
              >
                VIEW IN LINEAR ↗
              </a>
            )}
            {initiative.linearSyncedAt && (
              <>
                <span className="opacity-30">·</span>
                <span>
                  SYNCED {new Date(initiative.linearSyncedAt).toLocaleTimeString()} · {new Date(initiative.linearSyncedAt).toLocaleDateString()}
                </span>
              </>
            )}
          </div>

          {/* §01 Why — Rationale */}
          <SectionHeader num="01" label="Why" detail="Rationale" />
          {!editingRationale ? (
            <blockquote
              onClick={() => setEditingRationale(true)}
              className="mt-3 cursor-pointer font-serif italic text-[15px] leading-[1.35] bg-muted border-2 border-border p-3.5 shadow-brut-sm"
            >
              {(rationale || initiative.why) ? (
                <>
                  <span className="not-italic opacity-60 text-[22px] mr-0.5">&ldquo;</span>
                  <span className="inline">
                    <ProseMarkdown>{rationale || initiative.why}</ProseMarkdown>
                  </span>
                  <span className="not-italic opacity-60 text-[22px] ml-0.5">&rdquo;</span>
                </>
              ) : (
                <span className="opacity-60">Click to add rationale…</span>
              )}
            </blockquote>
          ) : (
            <div className="mt-3">
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.shiftKey)) {
                    e.preventDefault();
                    handleSaveRationale();
                    setEditingRationale(false);
                  } else if (e.key === "Escape") {
                    setRationale(initiative.why);
                    setEditingRationale(false);
                  }
                }}
                rows={3}
                autoFocus
                placeholder="Why are we doing this?"
              />
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await handleSaveRationale();
                    setEditingRationale(false);
                  }}
                  disabled={saving || rationale === initiative.why}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRationale(initiative.why);
                    setEditingRationale(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* §02 Scope — description + content */}
          {(initiative.description || initiative.content) && (
            <>
              <SectionHeader num="02" label="Scope" detail="What's in, what's out" />
              {initiative.description && (
                <div className="mt-3 text-[13px] leading-[1.55] text-ink-soft">
                  <ProseMarkdown>{initiative.description}</ProseMarkdown>
                </div>
              )}
              {initiative.content && (
                <div className="mt-2 text-[13px] leading-[1.55]">
                  <ProseMarkdown>{initiative.content}</ProseMarkdown>
                </div>
              )}
            </>
          )}

          {/* §03 Milestones — stamp-cards */}
          {(() => {
            const milestones: Milestone[] = (() => {
              try { return JSON.parse(initiative.milestones); } catch { return []; }
            })();
            if (milestones.length === 0) return null;
            return (
              <>
                <SectionHeader num="03" label="Milestones" detail={String(milestones.length)} />
                <div className="mt-3 flex flex-col gap-2.5">
                  {milestones.map((m) => {
                    const pct = Math.round(m.progress);
                    const done = pct >= 100;
                    return (
                      <div
                        key={m.name}
                        className={cn(
                          "border-2 border-border shadow-brut-sm p-3 grid grid-cols-[1fr_auto] gap-1.5",
                          done ? "bg-pillar-bx" : "bg-card"
                        )}
                      >
                        <div className="font-display text-[13px] tracking-[-0.01em]">{m.name}</div>
                        <div className="font-display text-[16px] tracking-[-0.03em]">{pct}%</div>
                        {m.description && (
                          <p className="col-span-full text-[11px] leading-[1.4] opacity-75">
                            {m.description}
                          </p>
                        )}
                        <div className="col-span-full h-1.5 border-[1.5px] border-border bg-muted mt-1">
                          <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* §04 Issues */}
          <SectionHeader num="04" label="Issues" detail={`${issues.length} · LINEAR`} />

          {initiative.linearProjectId && (
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <Input
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                placeholder="New issue title…"
                onKeyDown={(e) => e.key === "Enter" && handleCreateIssue()}
              />
              <Button onClick={handleCreateIssue} disabled={creatingIssue || !newIssueTitle.trim()}>
                + Create
              </Button>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-ink-soft py-4 text-center mt-3">Loading issues from Linear…</p>
          ) : issues.length === 0 && initiative.linearProjectId ? (
            <p className="text-sm text-ink-soft py-4 text-center mt-3">No issues yet</p>
          ) : !initiative.linearProjectId ? (
            <p className="text-sm text-ink-soft py-4 text-center mt-3">Not linked to a Linear project</p>
          ) : (
            <div className="mt-3 border-t-2 border-border">
              {issues.map((issue) => {
                const isExpanded = expandedIssueId === issue.id;
                const statusBg =
                  issue.statusType === "completed" ? "bg-pillar-bx" :
                  issue.statusType === "started"   ? "bg-pillar-dc" :
                  issue.statusType === "unstarted" ? "bg-pillar-ai" :
                                                     "bg-cream-2";
                return (
                  <div key={issue.id}>
                    <button
                      className="w-full grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center py-2 px-0.5 border-b-2 border-border text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                    >
                      <span className={cn("h-3 w-3 border-2 border-border", statusBg)} aria-hidden />
                      <span className="text-[12px] font-semibold truncate">{issue.title}</span>
                      <span className="font-mono text-[10px] tracking-[0.04em] opacity-70">{issue.identifier}</span>
                      {issue.assigneeName && (
                        <span className="h-[18px] w-[18px] border-[1.5px] border-border bg-pillar-pf font-display text-[9px] flex items-center justify-center">
                          {getMonogram(issue.assigneeName)}
                        </span>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-6 mr-2 mb-2 mt-1 border-2 border-border bg-card p-3 space-y-3">
                        {issue.description && (
                          <div className="prose prose-xs prose-muted max-w-none text-xs text-muted-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-4 [&_li]:my-0.5 [&_strong]:text-foreground/70">
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
                              {issue.description}
                            </Markdown>
                          </div>
                        )}
                        <div className="flex gap-3">
                          {/* Status dropdown */}
                          <div className="flex-1">
                            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</label>
                            <Select
                              value={issue.status}
                              onValueChange={(name) => {
                                const state = teamStates.find((s) => s.name === name);
                                if (state) handleUpdateIssue(issue.id, { stateId: state.id });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue placeholder={issue.status} />
                              </SelectTrigger>
                              <SelectContent>
                                {teamStates.map((s) => (
                                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Assignee dropdown */}
                          <div className="flex-1">
                            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Assignee</label>
                            <Select
                              value={issue.assigneeName ?? "Unassigned"}
                              onValueChange={(name) => {
                                if (name === "Unassigned") {
                                  handleUpdateIssue(issue.id, { assigneeId: null });
                                } else {
                                  const member = teamMembers.find((m) => m.name === name);
                                  if (member) handleUpdateIssue(issue.id, { assigneeId: member.id });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue placeholder={issue.assigneeName ?? "Unassigned"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Unassigned">Unassigned</SelectItem>
                                {teamMembers.map((m) => (
                                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="border-2 border-border px-1.5 py-0.5">{issue.priorityLabel}</span>
                          {issue.labels.map((label) => (
                            <span key={label} className="border border-border px-1.5 py-0.5 opacity-70">{label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Attachments */}
          <AttachmentSection
            targetType="initiative"
            targetId={initiative.id}
          />

          <CommentThread targetType="initiative" targetId={initiative.id} />

          {/* Footer actions */}
          <div className="mt-8 flex gap-2.5">
            <Button onClick={handleSaveRationale} className="shadow-brut-accent">
              SAVE CHANGES
            </Button>
            {initiative.linearProjectUrl && (
              <a
                href={initiative.linearProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center border-2 border-border bg-transparent text-foreground px-4 py-2 font-display uppercase tracking-[0.08em] text-sm shadow-brut-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--shadow-color)] transition-transform"
              >
                OPEN IN LINEAR ↗
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
