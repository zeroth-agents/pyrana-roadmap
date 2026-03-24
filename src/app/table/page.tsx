"use client";

import { useEffect, useState } from "react";
import { InitiativesTable } from "@/components/table/initiatives-table";

interface Pillar {
  id: string;
  name: string;
}

interface Initiative {
  id: string;
  title: string;
  why: string;
  lane: string;
  size: string;
  pillarId: string;
  dependsOn: string[];
  linearProjectUrl?: string | null;
}

export default function TablePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);

  useEffect(() => {
    fetch("/api/pillars").then((r) => r.json()).then(setPillars);
    fetch("/api/initiatives").then((r) => r.json()).then(setInitiatives);
  }, []);

  async function handleUpdate(id: string, data: Partial<Initiative>) {
    await fetch(`/api/initiatives/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await fetch("/api/initiatives").then((r) => r.json());
    setInitiatives(updated);
  }

  async function handleBulkUpdate(ids: string[], data: Partial<Initiative>) {
    await fetch("/api/initiatives/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, update: data }),
    });
    const updated = await fetch("/api/initiatives").then((r) => r.json());
    setInitiatives(updated);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">All Initiatives</h1>
      <InitiativesTable
        initiatives={initiatives}
        pillars={pillars}
        onUpdate={handleUpdate}
        onBulkUpdate={handleBulkUpdate}
      />
    </div>
  );
}
