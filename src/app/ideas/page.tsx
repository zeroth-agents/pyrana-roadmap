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
import { LayoutGrid, Table as TableIcon, Plus, X, Check } from "lucide-react";
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

type ViewMode = "gallery" | "table";
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
  const [showArchived, setShowArchived] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const didInitialLoadRef = useRef(false);

  useEffect(() => {
    const handle = setTimeout(() => setQ(searchInput), 200);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchIdeas = useCallback(
    async (offset = 0, append = false) => {
      const params = new URLSearchParams({ sort, limit: String(PAGE_SIZE), offset: String(offset) });
      // When "Show archived" is on, force status=archived regardless of dropdown.
      if (showArchived) {
        params.set("status", "archived");
      } else if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (pillarFilter !== "all") params.set("pillarId", pillarFilter);
      if (assigneeFilter) params.set("assigneeId", assigneeFilter);
      if (q) params.set("q", q);

      const data = await fetch(`/api/ideas?${params}`).then((r) => r.json());
      setTotal(data.total);
      setIdeas((prev) => (append ? [...prev, ...data.items] : data.items));
    },
    [sort, statusFilter, pillarFilter, assigneeFilter, q, showArchived]
  );

  useEffect(() => {
    const isInitial = !didInitialLoadRef.current;
    if (isInitial) {
      setLoading(true);
      Promise.all([
        fetchIdeas(0, false),
        fetch("/api/pillars").then((r) => r.json()).then(setPillars),
      ]).finally(() => {
        didInitialLoadRef.current = true;
        setLoading(false);
      });
    } else {
      fetchIdeas(0, false);
    }
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
    const shouldHide = !showArchived && statusFilter !== "all";
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
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch mb-4">
          <div className="border-b-[3px] border-ink pb-1.5">
            <Skeleton className="h-[40px] w-[180px]" />
          </div>
          <Skeleton className="h-12 w-[130px]" />
        </div>
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-[220px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="ml-auto h-10 w-[180px]" />
        </div>
        {/* Card grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border-2 border-border bg-muted shadow-brut-sm p-3 grid grid-cols-[38px_1fr] gap-2.5">
              <Skeleton className="h-full w-[38px]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-[85%]" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[70%]" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header — matches roadmap style */}
      <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch mb-4">
        <h1 className="font-display text-[44px] leading-[0.95] tracking-[-0.045em] border-b-[3px] border-ink pb-1.5">
          IDEAS
        </h1>
        <Button onClick={() => setCreateOpen(true)} className="h-12 px-4">
          <Plus className="mr-1 h-4 w-4" />
          New Idea
        </Button>
      </div>

      {/* Toolbar — uniform h-10 brutalist controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title, body…"
            title="Searches idea title and body"
            className="h-10 w-[220px] pr-8 text-sm shadow-brut-sm"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchInput("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center border-[1.5px] border-transparent hover:border-border hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex h-10 border-2 border-foreground bg-background shadow-brut-sm">
          <button
            onClick={() => setView("gallery")}
            aria-pressed={view === "gallery"}
            className={cn(
              "flex items-center gap-1.5 px-3 font-display text-[11px] tracking-[0.14em] uppercase border-r-2 border-foreground transition-colors",
              view === "gallery" ? "bg-ink text-cream" : "bg-transparent hover:bg-muted"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Gallery
          </button>
          <button
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            className={cn(
              "flex items-center gap-1.5 px-3 font-display text-[11px] tracking-[0.14em] uppercase transition-colors",
              view === "table" ? "bg-ink text-cream" : "bg-transparent hover:bg-muted"
            )}
          >
            <TableIcon className="h-3.5 w-3.5" />
            Table
          </button>
        </div>

        {/* Pillar */}
        <Select value={pillarFilter} onValueChange={(v) => v && setPillarFilter(v)}>
          <SelectTrigger className="h-10 w-[180px] gap-1.5 px-3">
            <span className="text-[8px] font-display uppercase tracking-[0.2em] opacity-55">Pillar</span>
            <SelectValue placeholder="All">
              {(value: string) => value === "all" ? "All" : pillars.find((p) => p.id === value)?.name ?? "All"}
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

        {/* Status — disabled when "Show archived" is on */}
        <Select
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v)}
          disabled={showArchived}
        >
          <SelectTrigger
            className={cn(
              "h-10 w-[150px] gap-1.5 px-3",
              showArchived && "opacity-50"
            )}
          >
            <span className="text-[8px] font-display uppercase tracking-[0.2em] opacity-55">Status</span>
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

        {/* Show archived toggle */}
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          aria-pressed={showArchived}
          title={showArchived ? "Viewing archived ideas" : "Show archived ideas instead"}
          className={cn(
            "flex h-10 items-center gap-1.5 border-2 border-foreground px-3 shadow-brut-sm transition-transform",
            "hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--shadow-color)]",
            showArchived ? "bg-ink text-cream" : "bg-background text-foreground"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex h-3.5 w-3.5 items-center justify-center border-[1.5px] border-current",
              showArchived && "bg-current"
            )}
          >
            {showArchived && <Check className="h-3 w-3 text-ink" strokeWidth={3} />}
          </span>
          <span className="text-[11px] font-display tracking-[0.12em] uppercase">
            Show archived
          </span>
        </button>

        {/* Assignee */}
        <AssigneeSelect
          compact
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          className="w-[180px]"
        />

        {/* Sort */}
        <Select value={sort} onValueChange={(v) => v && setSort(v as SortMode)}>
          <SelectTrigger className="ml-auto h-10 w-[180px] gap-1.5 px-3">
            <span className="text-[8px] font-display uppercase tracking-[0.2em] opacity-55">Sort</span>
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
