"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SYNC_STEPS = [
  { label: "Matching Linear team members…", progress: 10 },
  { label: "Fetching pillars from database…", progress: 20 },
  { label: "Pulling Agent Intelligence projects…", progress: 30 },
  { label: "Pulling Agent Collaboration projects…", progress: 45 },
  { label: "Pulling Data & Compute projects…", progress: 55 },
  { label: "Pulling Builder Experience projects…", progress: 70 },
  { label: "Pulling Platform Foundation projects…", progress: 80 },
  { label: "Reconciling orphaned initiatives…", progress: 90 },
];

const TOKEN_STEPS = [
  { label: "Generating secure token…", progress: 25 },
  { label: "Hashing and storing…", progress: 60 },
  { label: "Finalizing…", progress: 90 },
];

interface Token {
  id: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function SettingsPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tokenStep, setTokenStep] = useState(0);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tokens")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setTokens(data);
        setLoading(false);
      });
  }, []);

  async function handleCreate() {
    setCreating(true);
    setTokenStep(0);

    let step = 0;
    tokenTimerRef.current = setInterval(() => {
      step = Math.min(step + 1, TOKEN_STEPS.length - 1);
      setTokenStep(step);
    }, 600);

    try {
      const res = await fetch("/api/tokens", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create token");
      const data = await res.json();
      setNewToken(data.token);
      setTokens((prev) => [
        ...prev,
        { id: data.id, tokenPrefix: data.tokenPrefix, createdAt: data.createdAt, lastUsedAt: null },
      ]);
    } catch (e) {
      console.error("Token creation failed:", e);
    } finally {
      if (tokenTimerRef.current) clearInterval(tokenTimerRef.current);
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setTokens((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
      if (!res.ok) {
        // Revert on failure
        const refreshed = await fetch("/api/tokens").then((r) =>
          r.ok ? r.json() : []
        );
        setTokens(refreshed);
      }
    } catch {
      const refreshed = await fetch("/api/tokens").then((r) =>
        r.ok ? r.json() : []
      );
      setTokens(refreshed);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl">
        <h1 className="mb-4 text-xl font-semibold">Settings</h1>

        <h2 className="mb-2 text-lg font-medium">Linear Sync</h2>
        <Skeleton className="mb-4 h-4 w-72" />
        <Skeleton className="mb-8 h-9 w-36 rounded-md" />

        <h2 className="mb-2 text-lg font-medium">API Tokens</h2>
        <Skeleton className="mb-4 h-4 w-80" />
        <Skeleton className="mb-4 h-9 w-40 rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>

      <h2 className="mb-2 text-lg font-medium">Linear Sync</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Pull latest project data from Linear — descriptions, leads, issue counts, and statuses.
      </p>
      <div className="mb-8 space-y-3">
        <Button
          onClick={async () => {
            setSyncing(true);
            setSyncStep(0);
            setSyncResult(null);

            // Advance through steps on a timer
            let step = 0;
            stepTimerRef.current = setInterval(() => {
              step = Math.min(step + 1, SYNC_STEPS.length - 1);
              setSyncStep(step);
            }, 1800);

            try {
              const res = await fetch("/api/sync/linear", { method: "POST" });
              const data = await res.json();
              setSyncResult(data);
            } catch {
              setSyncResult({ created: 0, updated: 0, errors: ["Sync request failed"] });
            } finally {
              if (stepTimerRef.current) clearInterval(stepTimerRef.current);
              setSyncing(false);
            }
          }}
          disabled={syncing}
        >
          {syncing ? "Syncing…" : "Sync from Linear"}
        </Button>

        {syncing && (
          <div className="space-y-2">
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${SYNC_STEPS[syncStep].progress}%` }}
              />
            </div>
            {/* Step label */}
            <p className="animate-pulse text-sm text-muted-foreground">
              {SYNC_STEPS[syncStep].label}
            </p>
          </div>
        )}

        {!syncing && syncResult && (
          <p className={`text-sm ${syncResult.errors.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {syncResult.errors.length > 0
              ? `Error: ${syncResult.errors[0]}`
              : `Done — ${syncResult.created} created, ${syncResult.updated} updated`}
          </p>
        )}
      </div>

      <h2 className="mb-2 text-lg font-medium">API Tokens</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Personal access tokens for the Claude Code skill. Add to your{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>{" "}
        as <code className="rounded bg-muted px-1 py-0.5 text-xs">ROADMAP_API_TOKEN</code>.
      </p>

      {newToken && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-medium text-green-800">
              Token created. Copy it now — it won&apos;t be shown again.
            </p>
            <div className="flex gap-2">
              <Input value={newToken} readOnly className="font-mono text-xs" />
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(newToken);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 space-y-3">
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? "Generating…" : "Generate New Token"}
        </Button>

        {creating && (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${TOKEN_STEPS[tokenStep].progress}%` }}
              />
            </div>
            <p className="animate-pulse text-sm text-muted-foreground">
              {TOKEN_STEPS[tokenStep].label}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {tokens.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-center justify-between p-3">
              <div className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {t.tokenPrefix || t.id.slice(0, 8)}…
                </span>
                <span className="ml-3 text-muted-foreground">
                  Created {new Date(t.createdAt).toLocaleDateString()}
                </span>
                {t.lastUsedAt && (
                  <span className="ml-3 text-muted-foreground">
                    Last used {new Date(t.lastUsedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRevokeTarget(t.id)}
              >
                Revoke
              </Button>
            </CardContent>
          </Card>
        ))}
        {tokens.length === 0 && (
          <p className="text-sm text-muted-foreground">No tokens yet</p>
        )}
      </div>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke token</DialogTitle>
            <DialogDescription>
              This token will stop working immediately. Any integrations using it will lose access. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (revokeTarget) handleRevoke(revokeTarget);
                setRevokeTarget(null);
              }}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
