"use client";

import { useEffect, useState } from "react";
import { ProposalList } from "@/components/proposals/proposal-list";

interface Proposal {
  id: string;
  title: string;
  why: string;
  size: string;
  pillarId: string;
  proposedByName: string;
  status: string;
  reviewerNotes?: string;
}

interface Pillar {
  id: string;
  name: string;
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);

  useEffect(() => {
    fetch("/api/proposals").then((r) => r.json()).then(setProposals);
    fetch("/api/pillars").then((r) => r.json()).then(setPillars);
  }, []);

  async function handleReview(id: string, data: {
    status: "accepted" | "rejected";
    reviewerNotes?: string;
    lane?: string;
  }) {
    await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await fetch("/api/proposals").then((r) => r.json());
    setProposals(updated);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Proposals</h1>
      <ProposalList
        proposals={proposals}
        pillars={pillars}
        onReview={handleReview}
      />
    </div>
  );
}
