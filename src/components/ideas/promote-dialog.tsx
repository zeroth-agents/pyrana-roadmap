"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Pillar {
  id: string;
  name: string;
}

interface PromoteDialogProps {
  open: boolean;
  onClose: () => void;
  onPromote: (pillarId: string, lane: string, linearProjectId?: string) => Promise<void>;
  pillars: Pillar[];
  defaultPillarId?: string | null;
}

const LANE_OPTIONS = [
  { value: "now", label: "Now" },
  { value: "next", label: "Next" },
  { value: "backlog", label: "Backlog" },
];

export function PromoteDialog({
  open,
  onClose,
  onPromote,
  pillars,
  defaultPillarId,
}: PromoteDialogProps) {
  const [pillarId, setPillarId] = useState(defaultPillarId ?? "");
  const [lane, setLane] = useState("backlog");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [projectQuery, setProjectQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; status: string; url: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (mode !== "existing") return;
    const q = projectQuery.trim();
    const handle = setTimeout(() => {
      if (!q) {
        setResults([]);
        return;
      }
      fetch(`/api/linear/projects?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then(setResults);
    }, 200);
    return () => clearTimeout(handle);
  }, [projectQuery, mode]);

  async function handleConfirm() {
    if (!pillarId) return;
    if (mode === "existing" && !selectedProject) return;
    setSubmitting(true);
    try {
      await onPromote(pillarId, lane, mode === "existing" ? selectedProject!.id : undefined);
      onClose();
    } catch (err) {
      console.error("Promote failed:", err);
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Promote to Linear Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "new"}
                onChange={() => setMode("new")}
              />
              Create new Linear project
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "existing"}
                onChange={() => setMode("existing")}
              />
              Link to existing
            </label>
          </div>

          {mode === "existing" && (
            <div>
              <label className="text-sm font-medium">Linear project</label>
              {selectedProject ? (
                <div className="mt-1 flex items-center justify-between border px-2 py-1 text-sm">
                  <span>{selectedProject.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedProject(null)}
                    className="text-xs text-muted-foreground"
                  >
                    clear
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    value={projectQuery}
                    onChange={(e) => setProjectQuery(e.target.value)}
                    placeholder="Search Linear projects..."
                    className="mt-1"
                  />
                  {results.length > 0 && (
                    <div className="mt-1 border max-h-40 overflow-y-auto">
                      {results.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedProject({ id: p.id, name: p.name })}
                          className="w-full px-2 py-1 text-left hover:bg-muted flex items-center justify-between text-sm"
                        >
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground">{p.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Pillar</label>
            <Select value={pillarId} onValueChange={(v) => v && setPillarId(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select pillar...">
                  {(value: string) => pillars.find((p) => p.id === value)?.name ?? "Select pillar..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {pillars.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Lane</label>
            <Select value={lane} onValueChange={(v) => v && setLane(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Backlog">
                  {(value: string) => LANE_OPTIONS.find((o) => o.value === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!pillarId || submitting || (mode === "existing" && !selectedProject)}
            className="w-full"
          >
            {submitting ? "Working..." : mode === "new" ? "Promote & Create" : "Promote & Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
