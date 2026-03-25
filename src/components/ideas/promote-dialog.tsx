"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  onPromote: (pillarId: string, lane: string) => Promise<void>;
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

  async function handleConfirm() {
    if (!pillarId) return;
    setSubmitting(true);
    try {
      await onPromote(pillarId, lane);
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
          <div>
            <label className="text-sm font-medium">Pillar</label>
            <Select value={pillarId} onValueChange={(v) => v && setPillarId(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select pillar..." />
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
                <SelectValue />
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
            disabled={!pillarId || submitting}
            className="w-full"
          >
            {submitting ? "Creating..." : "Promote"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
