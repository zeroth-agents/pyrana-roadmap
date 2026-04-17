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
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex gap-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
          {/* Table header */}
          <div className="rounded-md border">
            <div className="flex items-center gap-4 border-b px-4 py-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-48" />
            </div>
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-52" />
              </div>
            ))}
          </div>
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
