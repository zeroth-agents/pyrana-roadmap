"use client";

import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getPillarSlug } from "@/lib/pillar-utils";
import { cn } from "@/lib/utils";

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

interface Pillar {
  id: string;
  name: string;
}

interface InitiativesTableProps {
  initiatives: Initiative[];
  pillars: Pillar[];
  onUpdate: (id: string, data: Partial<Initiative>) => Promise<void>;
  onBulkUpdate: (ids: string[], data: Partial<Initiative>) => Promise<void>;
}

export function InitiativesTable({
  initiatives,
  pillars,
  onUpdate,
  onBulkUpdate,
}: InitiativesTableProps) {
  const [filters, setFilters] = useState({ pillar: "", lane: "", size: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  const filtered = useMemo(() => {
    return initiatives.filter((i) => {
      if (filters.pillar && i.pillarId !== filters.pillar) return false;
      if (filters.lane && i.lane !== filters.lane) return false;
      if (filters.size && i.size !== filters.size) return false;
      return true;
    });
  }, [initiatives, filters]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.id)));
    }
  }

  return (
    <div className="border-2 border-ink bg-cream shadow-brut-md overflow-hidden">
      {/* Header bar */}
      <div className="bg-ink text-cream px-4 py-2.5 flex justify-between items-baseline">
        <span className="font-display text-[18px] tracking-[-0.02em]">
          INITIATIVES · ALL
        </span>
        <span className="font-mono text-[10px] tracking-[0.1em]">
          {filtered.length} ROWS
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-b-2 border-ink bg-cream-2">
        <Select value={filters.pillar} onValueChange={(v) => setFilters({ ...filters, pillar: v === "all" ? "" : v ?? "" })}>
          <SelectTrigger
            className={cn(
              "h-auto min-h-9 w-48 border-2 border-ink px-3 py-1 font-bold text-[11px] shadow-brut-sm",
              filters.pillar ? "bg-pillar-ai" : "bg-cream"
            )}
          >
            <span className="text-[8px] tracking-[0.18em] uppercase opacity-55 mr-1">Pillar</span>
            <SelectValue placeholder="All Pillars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            {pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.lane} onValueChange={(v) => setFilters({ ...filters, lane: v === "all" ? "" : v ?? "" })}>
          <SelectTrigger
            className={cn(
              "h-auto min-h-9 w-32 border-2 border-ink px-3 py-1 font-bold text-[11px] shadow-brut-sm",
              filters.lane ? "bg-pillar-ai" : "bg-cream"
            )}
          >
            <span className="text-[8px] tracking-[0.18em] uppercase opacity-55 mr-1">Lane</span>
            <SelectValue placeholder="All Lanes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lanes</SelectItem>
            <SelectItem value="now">Now</SelectItem>
            <SelectItem value="next">Next</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.size} onValueChange={(v) => setFilters({ ...filters, size: v === "all" ? "" : v ?? "" })}>
          <SelectTrigger
            className={cn(
              "h-auto min-h-9 w-32 border-2 border-ink px-3 py-1 font-bold text-[11px] shadow-brut-sm",
              filters.size ? "bg-pillar-ai" : "bg-cream"
            )}
          >
            <span className="text-[8px] tracking-[0.18em] uppercase opacity-55 mr-1">Size</span>
            <SelectValue placeholder="All Sizes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            <SelectItem value="S">S</SelectItem>
            <SelectItem value="M">M</SelectItem>
            <SelectItem value="L">L</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions (shown when rows selected) */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-ink text-cream border-b-2 border-ink">
          <span className="font-display text-[16px] tracking-[-0.02em] pr-2.5 border-r-[1.5px] border-cream">
            {selected.size} SELECTED
          </span>
          <button
            onClick={() => onBulkUpdate([...selected], { lane: "now" })}
            className="border-[1.5px] border-cream bg-pillar-ai text-ink px-2.5 py-1 font-display text-[10px] tracking-[0.12em]"
          >
            → NOW
          </button>
          <button
            onClick={() => onBulkUpdate([...selected], { lane: "next" })}
            className="border-[1.5px] border-cream bg-transparent text-cream px-2.5 py-1 font-display text-[10px] tracking-[0.12em]"
          >
            → NEXT
          </button>
          <button
            onClick={() => onBulkUpdate([...selected], { lane: "backlog" })}
            className="border-[1.5px] border-cream bg-transparent text-cream px-2.5 py-1 font-display text-[10px] tracking-[0.12em]"
          >
            → BACKLOG
          </button>
          <span className="flex-1" />
          <button
            onClick={() => setSelected(new Set())}
            className="font-display text-[11px] text-cream"
          >
            CLEAR ✕
          </button>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                checked={selected.size === filtered.length && filtered.length > 0}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Pillar</TableHead>
            <TableHead>Lane</TableHead>
            <TableHead className="w-16">Size</TableHead>
            <TableHead>Why</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((initiative) => {
            const pillar = pillars.find((p) => p.id === initiative.pillarId);
            const pillarSlug = getPillarSlug(pillar?.name);
            const isChecked = selected.has(initiative.id);
            return (
              <TableRow key={initiative.id} data-state={isChecked ? "selected" : undefined}>
                <TableCell>
                  <Checkbox checked={isChecked} onCheckedChange={() => toggleSelect(initiative.id)} />
                </TableCell>
                <TableCell
                  className="cursor-pointer"
                  onClick={() => setEditingCell({ id: initiative.id, field: "title" })}
                >
                  {editingCell?.id === initiative.id && editingCell.field === "title" ? (
                    <Input
                      defaultValue={initiative.title}
                      autoFocus
                      onBlur={(e) => {
                        onUpdate(initiative.id, { title: e.target.value });
                        setEditingCell(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onUpdate(initiative.id, { title: (e.target as HTMLInputElement).value });
                          setEditingCell(null);
                        }
                      }}
                    />
                  ) : (
                    <span className="font-semibold">{initiative.title}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "border-[1.5px] border-ink font-display text-[9px] tracking-[0.12em] uppercase px-1.5 py-0.5 inline-block",
                    `bg-pillar-${pillarSlug}`
                  )}>
                    {pillar?.name ?? "Unknown"}
                  </span>
                </TableCell>
                <TableCell>
                  <Select
                    value={initiative.lane}
                    onValueChange={(v) => v && onUpdate(initiative.id, { lane: v })}
                  >
                    <SelectTrigger className={cn(
                      "h-auto border-[1.5px] border-transparent hover:border-ink bg-transparent px-1.5 py-0.5 font-display text-[10px] tracking-[0.14em] uppercase shadow-none",
                      initiative.lane === "now" && "bg-ink text-cream border-ink",
                      initiative.lane === "next" && "bg-cream border-ink text-ink",
                      initiative.lane === "backlog" && "border-dashed border-ink text-ink-soft",
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Now</SelectItem>
                      <SelectItem value="next">Next</SelectItem>
                      <SelectItem value="backlog">Backlog</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={initiative.size}
                    onValueChange={(v) => v && onUpdate(initiative.id, { size: v })}
                  >
                    <SelectTrigger className={cn(
                      "h-auto w-[32px] border-[1.5px] border-ink px-0 py-0 justify-center font-display text-[12px] shadow-none",
                      initiative.size === "S" && "bg-pillar-bx",
                      initiative.size === "M" && "bg-pillar-ai",
                      initiative.size === "L" && "bg-pillar-ac",
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell
                  className="max-w-xs cursor-pointer"
                  onClick={() => setEditingCell({ id: initiative.id, field: "why" })}
                >
                  {editingCell?.id === initiative.id && editingCell.field === "why" ? (
                    <Input
                      defaultValue={initiative.why}
                      autoFocus
                      onBlur={(e) => {
                        onUpdate(initiative.id, { why: e.target.value });
                        setEditingCell(null);
                      }}
                    />
                  ) : (
                    <span className="block max-w-[320px] truncate text-ink-soft">{initiative.why}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
