"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IdeasGallery } from "@/components/ideas/ideas-gallery";
import { IdeasList } from "@/components/ideas/ideas-list";
import { IdeaDetail } from "@/components/ideas/idea-detail";
import { CreateIdeaDialog } from "@/components/ideas/create-idea-dialog";
import { LayoutGrid, List, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Pillar {
  id: string;
  name: string;
}

interface IdeaData {
  id: string;
  title: string;
  body: string;
  authorName: string;
  pillarId: string | null;
  status: string;
  priorityScore: number | null;
  voteCount: number;
  commentCount: number;
  userVoted: boolean;
  createdAt: string;
}

type ViewMode = "gallery" | "list";
type SortMode = "votes" | "comments" | "newest" | "priority";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "votes", label: "Most Voted" },
  { value: "comments", label: "Most Commented" },
  { value: "newest", label: "Newest" },
  { value: "priority", label: "Priority" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "promoted", label: "Promoted" },
  { value: "archived", label: "Archived" },
];

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaData[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [view, setView] = useState<ViewMode>("gallery");
  const [sort, setSort] = useState<SortMode>("votes");
  const [statusFilter, setStatusFilter] = useState("open");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchIdeas = useCallback(() => {
    const params = new URLSearchParams({ sort });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (pillarFilter !== "all") params.set("pillarId", pillarFilter);

    fetch(`/api/ideas?${params}`)
      .then((r) => r.json())
      .then(setIdeas);
  }, [sort, statusFilter, pillarFilter]);

  useEffect(() => {
    fetchIdeas();
    fetch("/api/pillars")
      .then((r) => r.json())
      .then(setPillars);
  }, [fetchIdeas]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ideas</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          New Idea
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex rounded-lg border">
          <button
            onClick={() => setView("gallery")}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-xs transition-colors",
              view === "gallery"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Gallery
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-xs transition-colors",
              view === "list"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>

        {/* Filters */}
        <Select value={pillarFilter} onValueChange={(v) => v && setPillarFilter(v)}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All Pillars">
              {(value: string) => value === "all" ? "All Pillars" : pillars.find((p) => p.id === value)?.name ?? "All Pillars"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            {pillars.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="All">
              {(value: string) => STATUS_OPTIONS.find((o) => o.value === value)?.label ?? "All"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort:</span>
          <Select value={sort} onValueChange={(v) => v && setSort(v as SortMode)}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Most Voted">
                {(value: string) => SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Most Voted"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {view === "gallery" ? (
        <IdeasGallery
          ideas={ideas}
          pillars={pillars}
          onSelectIdea={setSelectedIdeaId}
          onRefresh={fetchIdeas}
        />
      ) : (
        <IdeasList
          ideas={ideas}
          pillars={pillars}
          onSelectIdea={setSelectedIdeaId}
        />
      )}

      {/* Detail panel */}
      {selectedIdeaId && (
        <IdeaDetail
          ideaId={selectedIdeaId}
          pillars={pillars}
          onClose={() => setSelectedIdeaId(null)}
          onUpdate={fetchIdeas}
        />
      )}

      {/* Create dialog */}
      <CreateIdeaDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchIdeas}
        pillars={pillars}
      />
    </div>
  );
}
