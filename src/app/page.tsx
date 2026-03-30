"use client";

import { useEffect, useState } from "react";
import { BoardView } from "@/components/board/board-view";
import { InitiativeDetail } from "@/components/initiative-detail";

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

  useEffect(() => {
    async function load() {
      const [pillarsRes, initiativesRes] = await Promise.all([
        fetch("/api/pillars"),
        fetch("/api/initiatives"),
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
    }
    load();
  }, []);

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

  return (
    <>
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
