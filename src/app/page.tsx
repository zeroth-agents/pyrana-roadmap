"use client";

import { useEffect, useState } from "react";
import { BoardView } from "@/components/board/board-view";
import { InitiativeDetail } from "@/components/initiative-detail";
import { AssigneeSelect } from "@/components/assignee-select";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function BoardPage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pillarsRes, initiativesRes] = await Promise.all([
        fetch("/api/pillars"),
        fetch(`/api/initiatives${assigneeFilter ? `?assigneeId=${assigneeFilter}` : ""}`),
      ]);

      // If any request is 401, redirect to sign-in
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

  async function handleReorder(
    updates: Array<{ id: string; sortOrder: number; lane?: string; pillarId?: string }>
  ) {
    await fetch("/api/initiatives/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await fetch("/api/initiatives").then((r) => r.json());
    setInitiatives(data);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Assignee filter skeleton */}
        <div className="flex items-center gap-2 px-4">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-7 w-[180px]" />
        </div>
        {/* Capacity indicator + lane toggles */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
        {/* Board grid — 5 pillar columns, 2 lane rows */}
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 w-24" />
          ))}
          {/* Now lane */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`now-${i}`} className="space-y-2">
              {i === 0 && <Skeleton className="h-3 w-8" />}
              <Skeleton className="h-20 w-full rounded-lg" />
              {i % 2 === 0 && <Skeleton className="h-20 w-full rounded-lg" />}
            </div>
          ))}
          {/* Next lane */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`next-${i}`} className="space-y-2">
              {i === 0 && <Skeleton className="h-3 w-8" />}
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2 px-4">
        <span className="text-xs text-muted-foreground">Assignee:</span>
        <AssigneeSelect
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          className="h-7 w-[180px] text-xs"
        />
      </div>
      <BoardView
        pillars={pillars}
        initiatives={initiatives}
        onReorder={handleReorder}
        onCardClick={(init) => {
          console.log("[page] onCardClick called", init.title);
          setSelectedInitiative(init);
        }}
      />
      {selectedInitiative && (
        <InitiativeDetail
          initiative={selectedInitiative}
          pillars={pillars}
          onClose={() => setSelectedInitiative(null)}
          onUpdate={() => {
            fetch("/api/initiatives").then((r) => r.json()).then(setInitiatives);
          }}
        />
      )}
    </>
  );
}
