"use client";

import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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

  const pillarMap = useMemo(
    () => Object.fromEntries(pillars.map((p) => [p.id, p.name])),
    [pillars]
  );

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
      next.has(id) ? next.delete(id) : next.add(id);
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filters.pillar} onValueChange={(v) => setFilters({ ...filters, pillar: v === "all" ? "" : v ?? "" })}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Pillars" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            {pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.lane} onValueChange={(v) => setFilters({ ...filters, lane: v === "all" ? "" : v ?? "" })}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Lanes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lanes</SelectItem>
            <SelectItem value="now">Now</SelectItem>
            <SelectItem value="next">Next</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.size} onValueChange={(v) => setFilters({ ...filters, size: v === "all" ? "" : v ?? "" })}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Sizes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            <SelectItem value="S">S</SelectItem>
            <SelectItem value="M">M</SelectItem>
            <SelectItem value="L">L</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded border bg-muted/50 p-2">
          <span className="text-sm">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => onBulkUpdate([...selected], { lane: "now" })}>
            Move to Now
          </Button>
          <Button size="sm" variant="outline" onClick={() => onBulkUpdate([...selected], { lane: "next" })}>
            Move to Next
          </Button>
          <Button size="sm" variant="outline" onClick={() => onBulkUpdate([...selected], { lane: "backlog" })}>
            Move to Backlog
          </Button>
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
            <TableHead>Size</TableHead>
            <TableHead>Why</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((initiative) => (
            <TableRow key={initiative.id}>
              <TableCell>
                <Checkbox
                  checked={selected.has(initiative.id)}
                  onCheckedChange={() => toggleSelect(initiative.id)}
                />
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
                  initiative.title
                )}
              </TableCell>
              <TableCell>
                <Select
                  value={initiative.pillarId}
                  onValueChange={(v) => v && onUpdate(initiative.id, { pillarId: v })}
                >
                  <SelectTrigger className="h-8 w-40 border-0 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pillars.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={initiative.lane}
                  onValueChange={(v) => v && onUpdate(initiative.id, { lane: v })}
                >
                  <SelectTrigger className="h-8 w-24 border-0 bg-transparent">
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
                  <SelectTrigger className="h-8 w-16 border-0 bg-transparent">
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
                className="max-w-xs cursor-pointer truncate"
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
                  initiative.why
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
