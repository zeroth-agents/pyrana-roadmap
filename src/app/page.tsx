"use client";

import { useEffect, useState } from "react";
import { BoardView } from "@/components/board/board-view";
import { InitiativeDetail } from "@/components/initiative-detail";

interface Initiative {
  id: string;
  title: string;
  size: string;
  why: string;
  dependsOn: string[];
  lane: string;
  pillarId: string;
  linearProjectUrl?: string | null;
  linearStatus?: string | null;
  linearAssignee?: string | null;
  linearSyncedAt?: string | null;
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
    fetch("/api/pillars").then((r) => r.json()).then(setPillars);
    fetch("/api/initiatives").then((r) => r.json()).then(setInitiatives);
    fetch("/api/proposals?status=pending")
      .then((r) => r.json())
      .then((proposals: Array<{ pillarId: string }>) => {
        const counts: Record<string, number> = {};
        proposals.forEach((p) => {
          counts[p.pillarId] = (counts[p.pillarId] ?? 0) + 1;
        });
        setProposalCounts(counts);
      });
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
        onCardClick={setSelectedInitiative}
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
