"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface CreateIdeaDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  pillars: Pillar[];
}

export function CreateIdeaDialog({
  open,
  onClose,
  onCreated,
  pillars,
}: CreateIdeaDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pillarId, setPillarId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          ...(pillarId ? { pillarId } : {}),
        }),
      });

      if (res.ok) {
        setTitle("");
        setBody("");
        setPillarId("");
        onCreated();
        onClose();
      }
    } catch (err) {
      console.error("Failed to create idea:", err);
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share an Idea</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the idea?"
              className="mt-1"
              maxLength={200}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Pillar (optional)</label>
            <Select value={pillarId} onValueChange={(v) => v && setPillarId(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="No pillar">
                  {(value: string) => pillars.find((p) => p.id === value)?.name ?? "No pillar"}
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
            <label className="text-sm font-medium">Description (Markdown)</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the idea, the problem it solves, and how you'd approach it..."
              className="mt-1 min-h-[200px] font-mono text-sm"
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !body.trim() || submitting}
            className="w-full"
          >
            {submitting ? "Publishing..." : "Publish Idea"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
