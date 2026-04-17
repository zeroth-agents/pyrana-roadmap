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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CommentThread } from "./comment-thread";
import { AttachmentSection } from "./attachments/attachment-section";
import { AssigneeSelect } from "./assignee-select";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPillarSlug } from "@/lib/pillar-utils";
import { cn } from "@/lib/utils";

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

const STATUS_DOT_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  triage: "#94a3b8",
  unstarted: "#f59e0b",
  started: "#3399FF",
  completed: "#16a34a",
  canceled: "#ef4444",
};

const LANE_LABELS: Record<string, string> = {
  now: "Now",
  next: "Next",
  backlog: "Backlog",
  done: "Done",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

export function InitiativeDetail({
  initiative,
  pillars,
  onClose,
  onUpdate,
}: InitiativeDetailProps) {
  const [lane, setLane] = useState(initiative.lane);
  const [assigneeId, setAssigneeId] = useState(initiative.assigneeId ?? null);
  const [rationale, setRationale] = useState(initiative.why);
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
          <SheetTitle className="font-display text-[32px] leading-[0.95] tracking-[-0.035em] pb-3 border-b-[3px] border-ink">
            {initiative.title}
          </SheetTitle>
          {initiative.linearProjectId && (
            <div className="mt-2 font-mono text-[11px] border-2 border-ink bg-cream-2 px-2 py-1 shadow-brut-sm self-start">
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
              <SelectTrigger className="h-auto border-2 border-ink bg-ink text-cream px-2.5 py-1 shadow-[2px_2px_0_var(--ink)] font-bold text-[11px] tracking-[0.04em] w-auto gap-1.5">
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
                "flex items-center gap-1.5 border-2 border-ink px-2.5 py-1 font-bold text-[11px] tracking-[0.04em] shadow-[2px_2px_0_var(--ink)]",
                `bg-pillar-${getPillarSlug(pillarName)}`
              )}
            >
              <span className="text-[8px] tracking-[0.2em] uppercase opacity-55 mr-0.5">Pillar</span>
              {pillarName}
            </div>

            {/* Size + issue count chip */}
            <div className="border-2 border-ink bg-destructive px-2.5 py-1 font-bold text-[11px] tracking-[0.04em] shadow-[2px_2px_0_var(--ink)] text-ink flex items-center gap-1.5">
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
              <div className="h-5 border-2 border-ink bg-cream-2 overflow-hidden relative">
                <div className="h-full bg-ink transition-all" style={{ width: `${progress}%` }} />
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
          {(rationale || initiative.why) ? (
            <blockquote className="mt-3 font-serif italic text-[15px] leading-[1.35] bg-cream-2 border-2 border-ink p-3.5 shadow-brut-sm before:content-['\u201C'] before:text-[22px] before:not-italic before:opacity-60 before:mr-0.5 after:content-['\u201D'] after:text-[22px] after:not-italic after:opacity-60 after:ml-0.5">
              {rationale || initiative.why}
            </blockquote>
          ) : null}
          <div className="mt-3">
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.shiftKey) && rationale !== initiative.why) {
                  e.preventDefault();
                  handleSaveRationale();
                }
              }}
              rows={2}
              placeholder="Why are we doing this?"
            />
            {rationale !== initiative.why && (
              <Button
                size="sm"
                onClick={handleSaveRationale}
                disabled={saving}
                className="mt-2"
              >
                Save Rationale
              </Button>
            )}
          </div>

          {/* §02 Scope — description + content */}
          {(initiative.description || initiative.content) && (
            <>
              <SectionHeader num="02" label="Scope" detail="What's in, what's out" />
              {initiative.description && (
                <p className="mt-3 text-[13px] leading-[1.55] text-ink-soft">
                  {initiative.description}
                </p>
              )}
              {initiative.content && (
                <div className="mt-2 text-[13px] leading-[1.55] whitespace-pre-wrap">
                  {initiative.content}
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
                          "border-2 border-ink shadow-brut-sm p-3 grid grid-cols-[1fr_auto] gap-1.5",
                          done ? "bg-pillar-bx" : "bg-cream"
                        )}
                      >
                        <div className="font-display text-[13px] tracking-[-0.01em]">{m.name}</div>
                        <div className="font-display text-[16px] tracking-[-0.03em]">{pct}%</div>
                        {m.description && (
                          <p className="col-span-full text-[11px] leading-[1.4] opacity-75">
                            {m.description}
                          </p>
                        )}
                        <div className="col-span-full h-1.5 border-[1.5px] border-ink bg-cream-2 mt-1">
                          <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* Issues list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                Issues ({issues.length})
              </span>
            </div>

            {/* New issue form */}
            {initiative.linearProjectId && (
              <div className="flex gap-2 mb-3">
                <Input
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="New issue title..."
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateIssue()}
                />
                <Button
                  size="sm"
                  onClick={handleCreateIssue}
                  disabled={creatingIssue || !newIssueTitle.trim()}
                >
                  Create
                </Button>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading issues from Linear...</p>
            ) : issues.length === 0 && initiative.linearProjectId ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No issues yet</p>
            ) : !initiative.linearProjectId ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Not linked to a Linear project</p>
            ) : (
              <div className="flex flex-col gap-1">
                {issues.map((issue) => {
                  const isExpanded = expandedIssueId === issue.id;
                  const dotColor = STATUS_DOT_COLORS[issue.statusType] ?? "#94a3b8";

                  return (
                    <div key={issue.id}>
                      {/* Issue row */}
                      <button
                        className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                      >
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="text-sm flex-1 truncate">{issue.title}</span>
                        <span className="text-xs text-muted-foreground">{issue.identifier}</span>
                        {issue.assigneeName && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[8px] font-semibold text-primary-foreground flex-shrink-0">
                            {getInitials(issue.assigneeName)}
                          </div>
                        )}
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="ml-6 mr-2 mb-2 mt-1 rounded-md border bg-card p-3 space-y-3">
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
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{issue.priorityLabel}</Badge>
                            {issue.labels.map((label) => (
                              <Badge key={label} variant="secondary" className="text-[10px]">{label}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Attachments */}
          <AttachmentSection
            targetType="initiative"
            targetId={initiative.id}
          />

          <Separator />

          <CommentThread targetType="initiative" targetId={initiative.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
