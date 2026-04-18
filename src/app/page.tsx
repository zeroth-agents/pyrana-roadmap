"use client";

import { useEffect, useState } from "react";
import { BoardView } from "@/components/board/board-view";
import { InitiativesTable } from "@/components/table/initiatives-table";
import { InitiativeDetail } from "@/components/initiative-detail";
import { AssigneeSelect } from "@/components/assignee-select";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Initiative {
  id: string;
  title: string;
  description: string;
  content: string;
  milestones: string;
  size: string;
  why: string;
  dependsOn: string[];
  lane: string;
  pillarId: string;
  linearProjectUrl?: string | null;
  linearStatus?: string | null;
  linearAssignee?: string | null;
  linearProjectLead?: string | null;
  linearSyncedAt?: string | null;
  linearProjectId?: string | null;
  issueCountTotal?: number;
  issueCountDone?: number;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

interface Pillar {
  id: string;
  name: string;
  customerStory: string;
}

type ViewMode = "board" | "table";

export default function RoadmapPage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("board");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pillarsRes, initiativesRes] = await Promise.all([
        fetch("/api/pillars"),
        fetch(`/api/initiatives${assigneeFilter ? `?assigneeId=${assigneeFilter}` : ""}`),
      ]);

      if ([pillarsRes, initiativesRes].some((r) => r.status === 401)) {
        window.location.href = "/api/auth/signin";
        return;
      }

      const pillarsData = await pillarsRes.json();
      const initiativesData = await initiativesRes.json();

      if (Array.isArray(pillarsData)) setPillars(pillarsData);
      if (Array.isArray(initiativesData)) setInitiatives(initiativesData);
      setLoading(false);
    }
    load();
  }, [assigneeFilter]);

  async function refreshInitiatives() {
    const data = await fetch(
      `/api/initiatives${assigneeFilter ? `?assigneeId=${assigneeFilter}` : ""}`
    ).then((r) => r.json());
    if (Array.isArray(data)) setInitiatives(data);
  }

  async function handleReorder(
    updates: Array<{ id: string; sortOrder: number; lane?: string; pillarId?: string }>
  ) {
    await fetch("/api/initiatives/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    refreshInitiatives();
  }

  async function handleUpdate(id: string, data: Partial<Initiative>) {
    await fetch(`/api/initiatives/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    refreshInitiatives();
  }

  async function handleBulkUpdate(ids: string[], data: Partial<Initiative>) {
    await fetch("/api/initiatives/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, update: data }),
    });
    refreshInitiatives();
  }

  const quarterLabel = (() => {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} · ${d.getFullYear()}`;
  })();

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch mb-4">
          <div className="border-b-[3px] border-ink pb-1.5 flex items-baseline gap-3">
            <Skeleton className="h-[40px] w-[340px]" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-12 w-[160px]" />
            <Skeleton className="h-12 w-[200px]" />
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>

        <div
          className="pb-4"
          style={{
            display: "grid",
            gridTemplateColumns: "44px repeat(5, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <div aria-hidden />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-[96px] w-full" />
          ))}
          <div className="flex items-end justify-end pb-3">
            <Skeleton className="h-[72px] w-5" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`now-${i}`} className="space-y-2">
              <Skeleton className="h-[70px] w-full" />
              {i % 2 === 0 && <Skeleton className="h-[70px] w-full" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Shared header: title + view toggle + assignee filter */}
      <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch mb-4">
        <h1 className="font-display text-[44px] leading-[0.95] tracking-[-0.045em] border-b-[3px] border-ink pb-1.5 flex items-baseline gap-3">
          THE&nbsp;ROADMAP
          <span className="bg-ink text-cream font-sans text-[11px] font-semibold tracking-[0.12em] px-2 py-0.5 self-center translate-y-[-6px]">
            {quarterLabel}
          </span>
        </h1>
        <div className="flex items-stretch gap-2">
          <div className="flex h-12 border-2 border-foreground bg-background shadow-brut-sm">
            <button
              onClick={() => setView("board")}
              aria-pressed={view === "board"}
              className={cn(
                "flex items-center gap-1.5 px-3 font-display text-[11px] tracking-[0.14em] uppercase border-r-2 border-foreground transition-colors",
                view === "board" ? "bg-ink text-cream" : "bg-transparent hover:bg-muted"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              className={cn(
                "flex items-center gap-1.5 px-3 font-display text-[11px] tracking-[0.14em] uppercase transition-colors",
                view === "table" ? "bg-ink text-cream" : "bg-transparent hover:bg-muted"
              )}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Table
            </button>
          </div>
          <AssigneeSelect
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            className="w-[200px]"
          />
        </div>
      </div>

      {view === "board" ? (
        <BoardView
          pillars={pillars}
          initiatives={initiatives}
          onReorder={handleReorder}
          onCardClick={setSelectedInitiative}
        />
      ) : (
        <InitiativesTable
          initiatives={initiatives}
          pillars={pillars}
          onUpdate={handleUpdate}
          onBulkUpdate={handleBulkUpdate}
          onRowClick={setSelectedInitiative}
        />
      )}

      {selectedInitiative && (
        <InitiativeDetail
          initiative={selectedInitiative}
          pillars={pillars}
          onClose={() => setSelectedInitiative(null)}
          onUpdate={refreshInitiatives}
        />
      )}
    </>
  );
}
