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
}

interface Pillar {
  id: string;
  name: string;
  customerStory: string;
}

export default function BoardPage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [proposalCounts, setProposalCounts] = useState<Record<string, number>>({});
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);

  useEffect(() => {
    async function load() {
      const [pillarsRes, initiativesRes, proposalsRes] = await Promise.all([
        fetch("/api/pillars"),
        fetch("/api/initiatives"),
        fetch("/api/proposals?status=pending"),
      ]);

      // If any request is 401, redirect to sign-in
      if ([pillarsRes, initiativesRes, proposalsRes].some((r) => r.status === 401)) {
        window.location.href = "/api/auth/signin";
        return;
      }

      const pillarsData = await pillarsRes.json();
      const initiativesData = await initiativesRes.json();
      const proposalsData = await proposalsRes.json();

      if (Array.isArray(pillarsData)) setPillars(pillarsData);
      if (Array.isArray(initiativesData)) setInitiatives(initiativesData);
      if (Array.isArray(proposalsData)) {
        const counts: Record<string, number> = {};
        proposalsData.forEach((p: { pillarId: string }) => {
          counts[p.pillarId] = (counts[p.pillarId] ?? 0) + 1;
        });
        setProposalCounts(counts);
      }
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
        proposalCounts={proposalCounts}
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
