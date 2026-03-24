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

interface Initiative {
  id: string;
  title: string;
  why: string;
  lane: string;
  size: string;
  pillarId: string;
  linearProjectId?: string | null;
  linearProjectUrl?: string | null;
  linearSyncedAt?: string | null;
  issueCountTotal?: number;
  issueCountDone?: number;
  dependsOn: string[];
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

export function InitiativeDetail({
  initiative,
  pillars,
  onClose,
  onUpdate,
}: InitiativeDetailProps) {
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

    setLoading(true);
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
        <SheetHeader className="px-7 pt-5 pb-0">
          <SheetTitle className="text-xl">{initiative.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-2 space-y-6 px-7 pb-7">
          {/* Status badges + progress */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-primary/10 text-primary border-0">
              {LANE_LABELS[initiative.lane] ?? initiative.lane}
            </Badge>
            <Badge variant="outline">{pillarName}</Badge>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-0">
              {initiative.size} · {total} issues
            </Badge>
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{done}/{total} done ({progress}%)</span>
            </div>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {initiative.linearProjectUrl && (
              <a
                href={initiative.linearProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline"
              >
                View in Linear ↗
              </a>
            )}
            {initiative.linearSyncedAt && (
              <span>Synced {new Date(initiative.linearSyncedAt).toLocaleString()}</span>
            )}
          </div>

          <Separator />

          {/* Rationale (editable) */}
          <div>
            <label className="text-xs font-medium">Rationale</label>
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="mt-1"
              rows={2}
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

          <Separator />

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
                            <p className="text-xs text-muted-foreground">{issue.description}</p>
                          )}
                          <div className="flex gap-3">
                            {/* Status dropdown */}
                            <div className="flex-1">
                              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</label>
                              <Select
                                value={teamStates.find((s) => s.name === issue.status)?.id ?? ""}
                                onValueChange={(stateId) => { if (stateId) handleUpdateIssue(issue.id, { stateId }); }}
                              >
                                <SelectTrigger className="h-8 text-xs mt-1">
                                  <SelectValue placeholder={issue.status} />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamStates.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Assignee dropdown */}
                            <div className="flex-1">
                              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Assignee</label>
                              <Select
                                value={issue.assigneeId ?? "unassigned"}
                                onValueChange={(val) =>
                                  handleUpdateIssue(issue.id, {
                                    assigneeId: val === "unassigned" ? null : val,
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 text-xs mt-1">
                                  <SelectValue placeholder={issue.assigneeName ?? "Unassigned"} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {teamMembers.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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

          <CommentThread targetType="initiative" targetId={initiative.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
