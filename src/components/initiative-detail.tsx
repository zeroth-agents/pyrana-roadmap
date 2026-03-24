"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CommentThread } from "./comment-thread";

interface Initiative {
  id: string;
  title: string;
  why: string;
  lane: string;
  size: string;
  pillarId: string;
  linearProjectUrl?: string | null;
  linearStatus?: string | null;
  linearSyncedAt?: string | null;
  dependsOn: string[];
}

interface Pillar {
  id: string;
  name: string;
}

interface InitiativeDetailProps {
  initiative: Initiative;
  pillars: Pillar[];
  onClose: () => void;
  onUpdate: () => void;
}

export function InitiativeDetail({
  initiative,
  pillars,
  onClose,
  onUpdate,
}: InitiativeDetailProps) {
  const [form, setForm] = useState({
    title: initiative.title,
    why: initiative.why,
    lane: initiative.lane,
    size: initiative.size,
    pillarId: initiative.pillarId,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/initiatives/${initiative.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onUpdate();
    onClose();
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Initiative Detail</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-medium">Why</label>
            <Textarea
              value={form.why}
              onChange={(e) => setForm({ ...form, why: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium">Lane</label>
              <Select value={form.lane} onValueChange={(v) => v && setForm({ ...form, lane: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Now</SelectItem>
                  <SelectItem value="next">Next</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium">Size</label>
              <Select value={form.size} onValueChange={(v) => v && setForm({ ...form, size: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">S (days)</SelectItem>
                  <SelectItem value="M">M (1-2 weeks)</SelectItem>
                  <SelectItem value="L">L (multi-week)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Pillar</label>
            <Select value={form.pillarId} onValueChange={(v) => v && setForm({ ...form, pillarId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {pillars.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linear status */}
          {initiative.linearProjectUrl && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{initiative.linearStatus ?? "Unknown"}</Badge>
              <a
                href={initiative.linearProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View in Linear
              </a>
              {initiative.linearSyncedAt && (
                <span className="text-xs text-muted-foreground">
                  Synced {new Date(initiative.linearSyncedAt).toLocaleString()}
                </span>
              )}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            Save Changes
          </Button>

          <Separator />

          <CommentThread targetType="initiative" targetId={initiative.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
