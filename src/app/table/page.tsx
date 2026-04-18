"use client";

import { useEffect, useState } from "react";
import { InitiativesTable } from "@/components/table/initiatives-table";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/pillars").then((r) => r.json()),
      fetch("/api/initiatives").then((r) => r.json()),
    ]).then(([p, i]) => {
      setPillars(p);
      setInitiatives(i);
      setLoading(false);
    });
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

  if (loading) {
    return (
      <div>
        <h1 className="font-display text-[32px] tracking-[-0.035em] mb-4 border-b-[3px] border-border pb-1.5">
          TABLE VIEW
        </h1>
        <div className="border-2 border-border bg-card shadow-brut-md overflow-hidden">
          {/* Header bar */}
          <div className="bg-ink text-cream px-4 py-2.5 flex justify-between items-baseline">
            <span className="font-display text-[18px] tracking-[-0.02em]">INITIATIVES · ALL</span>
            <Skeleton className="h-3 w-16 bg-cream/20" />
          </div>
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 px-4 py-3 border-b-2 border-border bg-muted">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
          {/* Table header row */}
          <div className="grid grid-cols-[32px_1.5fr_1fr_0.7fr_64px_2fr] items-center gap-3 border-b-[1.5px] border-border px-4 py-2.5">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-3.5 w-10" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          {/* Rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[32px_1.5fr_1fr_0.7fr_64px_2fr] items-center gap-3 border-b-[1.5px] border-border px-4 py-3 last:border-0"
            >
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-4 w-[80%]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[32px] tracking-[-0.035em] mb-4 border-b-[3px] border-border pb-1.5">
        TABLE VIEW
      </h1>
      <InitiativesTable
        initiatives={initiatives}
        pillars={pillars}
        onUpdate={handleUpdate}
        onBulkUpdate={handleBulkUpdate}
      />
    </div>
  );
}
