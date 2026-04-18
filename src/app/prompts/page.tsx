"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type PromptArgument = {
  name: string;
  description?: string;
  required?: boolean;
};

type Prompt = {
  id: string;
  name: string;
  title: string;
  description: string;
  template: string;
  arguments: PromptArgument[];
  enabled: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  id: string | null;
  name: string;
  title: string;
  description: string;
  template: string;
  arguments: PromptArgument[];
  enabled: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  title: "",
  description: "",
  template: "",
  arguments: [],
  enabled: true,
};

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; text: string } | null>(null);
  const [previewArgs, setPreviewArgs] = useState<Record<string, string>>({});

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/prompts");
    setPrompts(res.ok ? await res.json() : []);
    setLoading(false);
  }

  function openNew() {
    setEditing({ ...EMPTY_FORM });
  }

  function openEdit(p: Prompt) {
    setEditing({
      id: p.id,
      name: p.name,
      title: p.title,
      description: p.description,
      template: p.template,
      arguments: p.arguments ?? [],
      enabled: p.enabled,
    });
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = editing.id === null;
      const url = isNew ? "/api/prompts" : `/api/prompts/${editing.id}`;
      const method = isNew ? "POST" : "PATCH";
      const payload = isNew
        ? {
            name: editing.name,
            title: editing.title,
            description: editing.description,
            template: editing.template,
            arguments: editing.arguments,
            enabled: editing.enabled,
          }
        : {
            title: editing.title,
            description: editing.description,
            template: editing.template,
            arguments: editing.arguments,
            enabled: editing.enabled,
          };
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        toast.error(err.error ?? "Save failed");
        return;
      }
      toast.success(isNew ? "Prompt created" : "Prompt updated");
      setEditing(null);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(null);
    const res = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Prompt deleted");
    refresh();
  }

  async function handleToggle(p: Prompt) {
    const res = await fetch(`/api/prompts/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !p.enabled }),
    });
    if (res.ok) {
      setPrompts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, enabled: !p.enabled } : x))
      );
    }
  }

  function updateArg(index: number, patch: Partial<PromptArgument>) {
    if (!editing) return;
    const next = [...editing.arguments];
    next[index] = { ...next[index], ...patch };
    setEditing({ ...editing, arguments: next });
  }

  function addArg() {
    if (!editing) return;
    setEditing({
      ...editing,
      arguments: [...editing.arguments, { name: "", description: "", required: false }],
    });
  }

  function removeArg(index: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      arguments: editing.arguments.filter((_, i) => i !== index),
    });
  }

  function renderPreview() {
    if (!preview) return;
    const p = prompts.find((x) => x.name === preview.name);
    if (!p) return;
    const vars: Record<string, string> = {};
    for (const arg of p.arguments ?? []) {
      vars[arg.name] = previewArgs[arg.name] ?? "";
    }
    const text = p.template.replace(
      /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
      (_m, k) => vars[k] ?? ""
    );
    setPreview({ name: p.name, text });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold">MCP Prompts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Templated prompts served to MCP clients. Edits broadcast live to active sessions.
          </p>
        </div>
        <Button onClick={openNew}>New Prompt</Button>
      </div>

      <section className="border-2 border-border bg-card shadow-brut-md overflow-hidden">
        <header className="bg-ink text-cream px-3.5 py-2.5 flex justify-between items-baseline">
          <span className="font-display text-[16px] tracking-[-0.02em]">
            REGISTERED PROMPTS
          </span>
          <span className="text-[11px] opacity-70">
            {loading ? "…" : `${prompts.length} total`}
          </span>
        </header>

        <div className="p-4 space-y-2.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-2 border-border bg-card shadow-brut-sm p-3 space-y-1.5"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))
          ) : prompts.length === 0 ? (
            <div className="border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No prompts yet. Create one to get started.
            </div>
          ) : (
            prompts.map((p) => (
              <div
                key={p.id}
                className="border-2 border-border bg-card shadow-brut-sm p-3 grid grid-cols-[1fr_auto] items-start gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="font-mono text-[13px] font-semibold">{p.name}</code>
                    <span className="text-sm">{p.title}</span>
                    {!p.enabled && (
                      <span className="text-[10px] font-display tracking-wide px-1.5 py-0.5 border border-border bg-muted">
                        DISABLED
                      </span>
                    )}
                    {p.arguments && p.arguments.length > 0 && (
                      <span className="text-[10px] font-display tracking-wide px-1.5 py-0.5 border border-border">
                        {p.arguments.length} arg{p.arguments.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreview({ name: p.name, text: "" });
                      const next: Record<string, string> = {};
                      for (const a of p.arguments ?? []) next[a.name] = "";
                      setPreviewArgs(next);
                    }}
                  >
                    Preview
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(p)}>
                    {p.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(p.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Edit/create dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit prompt" : "New prompt"}
            </DialogTitle>
            <DialogDescription>
              Use {`{{argname}}`} placeholders in the template; declare each placeholder as an
              argument below.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium">Name (slug)</span>
                  <Input
                    value={editing.name}
                    disabled={editing.id !== null}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    placeholder="weekly_digest"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium">Title</span>
                  <Input
                    value={editing.title}
                    onChange={(e) =>
                      setEditing({ ...editing, title: e.target.value })
                    }
                    placeholder="Weekly Digest"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-medium">Description</span>
                <Input
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  placeholder="What this prompt does"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium">Template</span>
                <Textarea
                  value={editing.template}
                  onChange={(e) =>
                    setEditing({ ...editing, template: e.target.value })
                  }
                  placeholder="Summarize activity over the last {{days}} days…"
                  rows={8}
                  className="font-mono text-[13px]"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Arguments</span>
                  <Button variant="ghost" size="sm" onClick={addArg}>
                    + Add
                  </Button>
                </div>
                {editing.arguments.length === 0 && (
                  <p className="text-xs text-muted-foreground">No arguments declared.</p>
                )}
                {editing.arguments.map((arg, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center"
                  >
                    <Input
                      value={arg.name}
                      onChange={(e) => updateArg(i, { name: e.target.value })}
                      placeholder="name"
                      className="font-mono text-[13px]"
                    />
                    <Input
                      value={arg.description ?? ""}
                      onChange={(e) =>
                        updateArg(i, { description: e.target.value })
                      }
                      placeholder="description"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={arg.required ?? false}
                        onChange={(e) =>
                          updateArg(i, { required: e.target.checked })
                        }
                      />
                      required
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => removeArg(i)}>
                      ✕
                    </Button>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={(e) =>
                    setEditing({ ...editing, enabled: e.target.checked })
                  }
                />
                Enabled
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {preview?.name}</DialogTitle>
            <DialogDescription>
              Dry-run render — substitutes {`{{vars}}`} into the template.
            </DialogDescription>
          </DialogHeader>
          {preview && (() => {
            const p = prompts.find((x) => x.name === preview.name);
            if (!p) return null;
            return (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {(p.arguments ?? []).map((arg) => (
                  <label key={arg.name} className="space-y-1 block">
                    <span className="text-xs font-medium">
                      {arg.name}
                      {arg.required && <span className="text-destructive"> *</span>}
                    </span>
                    <Input
                      value={previewArgs[arg.name] ?? ""}
                      onChange={(e) =>
                        setPreviewArgs({ ...previewArgs, [arg.name]: e.target.value })
                      }
                      placeholder={arg.description ?? ""}
                    />
                  </label>
                ))}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Rendered message</span>
                    <Button variant="ghost" size="sm" onClick={renderPreview}>
                      Render
                    </Button>
                  </div>
                  <pre className="border-2 border-border bg-muted p-3 text-[12px] font-mono whitespace-pre-wrap max-h-64 overflow-auto">
                    {preview.text || <span className="text-muted-foreground">— click Render —</span>}
                  </pre>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete prompt?</DialogTitle>
            <DialogDescription>
              This removes the prompt from the database and notifies active MCP sessions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleting && handleDelete(deleting)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
