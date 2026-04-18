"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssigneeSelect } from "@/components/assignee-select";
import { IdeasGallery } from "@/components/ideas/ideas-gallery";
import { IdeasList } from "@/components/ideas/ideas-list";
import { IdeaDetail } from "@/components/ideas/idea-detail";
import { CreateIdeaDialog } from "@/components/ideas/create-idea-dialog";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  score: number;
  userVote: 1 | -1 | 0;
  commentCount: number;
  createdAt: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
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

const PAGE_SIZE = 30;

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaData[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [view, setView] = useState<ViewMode>("gallery");
  const [sort, setSort] = useState<SortMode>("votes");
  const [statusFilter, setStatusFilter] = useState("open");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [buriedCount, setBuriedCount] = useState(0);
  const [includeBuried, setIncludeBuried] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setQ(searchInput), 200);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchIdeas = useCallback(
    async (offset = 0, append = false) => {
      const params = new URLSearchParams({ sort, limit: String(PAGE_SIZE), offset: String(offset) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (pillarFilter !== "all") params.set("pillarId", pillarFilter);
      if (assigneeFilter) params.set("assigneeId", assigneeFilter);
      if (q) params.set("q", q);
      if (includeBuried) params.set("includeBuried", "true");

      const data = await fetch(`/api/ideas?${params}`).then((r) => r.json());
      setTotal(data.total);
      setBuriedCount(data.buriedCount);
      setIdeas((prev) => (append ? [...prev, ...data.items] : data.items));
    },
    [sort, statusFilter, pillarFilter, assigneeFilter, q, includeBuried]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchIdeas(0, false),
      fetch("/api/pillars").then((r) => r.json()).then(setPillars),
    ]).finally(() => setLoading(false));
  }, [fetchIdeas]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && ideas.length < total && !loadingMore) {
          setLoadingMore(true);
          try {
            await fetchIdeas(ideas.length, true);
          } finally {
            setLoadingMore(false);
          }
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [ideas.length, total, loadingMore, fetchIdeas]);

  async function handleArchive(ideaId: string) {
    const shouldHide = statusFilter !== "archived" && statusFilter !== "all";
    const previous = ideas;
    if (shouldHide) setIdeas((prev) => prev.filter((i) => i.id !== ideaId));

    const res = await fetch(`/api/ideas/${ideaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });

    if (!res.ok) {
      setIdeas(previous);
      toast.error("Could not archive");
      return;
    }

    toast("Archived", {
      action: {
        label: "Undo",
        onClick: async () => {
          await fetch(`/api/ideas/${ideaId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "open" }),
          });
          fetchIdeas();
        },
      },
    });
  }

  if (loading) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Ideas</h1>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        {/* Toolbar skeleton */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-[140px] rounded-lg" />
          <Skeleton className="h-8 w-[160px]" />
          <Skeleton className="h-8 w-[120px]" />
          <Skeleton className="h-8 w-[160px]" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-8 w-[150px]" />
          </div>
        </div>
        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex items-center gap-3 pt-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="ml-auto h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search ideas..."
          className="h-8 w-[200px] text-xs"
        />

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

        {statusFilter !== "archived" && (
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={includeBuried}
              onChange={(e) => setIncludeBuried(e.target.checked)}
            />
            Include buried
            {buriedCount > 0 && <span className="text-muted-foreground">({buriedCount})</span>}
          </label>
        )}

        <AssigneeSelect
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          className="h-8 w-[160px] text-xs"
        />

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
          onArchive={handleArchive}
        />
      ) : (
        <IdeasList
          ideas={ideas}
          pillars={pillars}
          onSelectIdea={setSelectedIdeaId}
        />
      )}

      <div ref={sentinelRef} className="h-6" />
      {loadingMore && <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>}
      {ideas.length > 0 && ideas.length >= total && (
        <p className="text-xs text-muted-foreground text-center py-2">All ideas loaded</p>
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
