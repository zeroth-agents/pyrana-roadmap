"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConnectedApps } from "@/components/settings/connected-apps";
import { OauthApps } from "@/components/settings/oauth-apps";

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

  function handleCopy() {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncStep(0);
    setSyncResult(null);

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
    <div className="max-w-xl space-y-6">
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>

      <ConnectedApps />
      <OauthApps />

      <div>
      <section className="border-2 border-border bg-card shadow-brut-md overflow-hidden mb-8">
        <header className="bg-ink text-cream px-3.5 py-2.5 flex justify-between items-baseline">
          <span className="font-display text-[16px] tracking-[-0.02em]">
            LINEAR SYNC
          </span>
          <span className="font-mono text-[10px] tracking-[0.08em]">
            {syncing
              ? `TRIGGERED ${new Date().toLocaleTimeString()} · MANUAL`
              : syncResult
              ? `LAST SYNC COMPLETE · ${(syncResult.created ?? 0) + (syncResult.updated ?? 0)} CHANGES`
              : "NOT YET RUN THIS SESSION"}
          </span>
        </header>

        <div className="p-4">
          <div className="flex justify-between items-baseline mb-2.5">
            <div className="font-display text-[10px] tracking-[0.16em] bg-pillar-ai border-2 border-border px-2 py-1 shadow-brut-sm flex items-center gap-1.5">
              {syncing && (
                <span
                  aria-hidden
                  className="w-2.5 h-2.5 bg-destructive border-2 border-border inline-block motion-safe:animate-[blip_1s_infinite]"
                />
              )}
              {syncing ? "RUNNING…" : syncResult ? "COMPLETE" : "READY"}
            </div>
            {syncing ? (
              <span className="font-mono text-[10px] opacity-70">
                ETA ~{Math.max(1, Math.round((SYNC_STEPS.length - syncStep) * 1.2))}s
              </span>
            ) : (
              <Button onClick={handleSync} disabled={syncing}>
                {syncResult ? "SYNC AGAIN" : "RUN SYNC"}
              </Button>
            )}
          </div>

          {/* Hatched progress meter */}
          <div className="h-[26px] border-2 border-border bg-muted shadow-brut-sm relative overflow-hidden">
            <div
              className="h-full transition-[width] ease-out duration-500"
              style={{
                width: `${
                  syncing
                    ? SYNC_STEPS[syncStep]?.progress ?? 0
                    : syncResult
                    ? 100
                    : 0
                }%`,
                backgroundImage:
                  "repeating-linear-gradient(45deg, var(--ink) 0 6px, oklch(0.3 0.01 60) 6px 12px)",
              }}
            />
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 font-display text-[14px] tracking-[-0.03em]"
              style={{ color: "var(--cream)", mixBlendMode: "difference" }}
            >
              {syncing
                ? SYNC_STEPS[syncStep]?.progress ?? 0
                : syncResult
                ? 100
                : 0}
              %
            </span>
          </div>

          {/* Steps list */}
          <ul className="mt-4">
            {SYNC_STEPS.map((step, idx) => {
              const isDone = syncResult != null || (syncing && idx < syncStep);
              const isActive = syncing && idx === syncStep;
              return (
                <li
                  key={step.label}
                  className={cn(
                    "grid grid-cols-[22px_1fr_auto] gap-2.5 items-center py-1.5 px-0.5 text-[12px] border-b-[1.5px] border-border",
                    isDone && "opacity-65",
                    isActive && "bg-muted px-1 font-bold"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "w-4 h-4 border-2 border-border relative",
                      isDone
                        ? "bg-ink"
                        : isActive
                        ? "bg-pillar-ai motion-safe:animate-[stepPulse_0.9s_infinite]"
                        : "bg-transparent"
                    )}
                  >
                    {isDone && (
                      <span className="absolute -top-[3px] left-[1px] font-display text-[13px] text-pillar-ai">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className={cn(isDone && "line-through")}>
                    {step.label}
                    {isActive && "…"}
                  </span>
                  <span className="font-mono text-[10px] opacity-60">
                    {isDone ? "done" : isActive ? "↻" : "—"}
                  </span>
                </li>
              );
            })}
          </ul>

          {!syncing && syncResult && syncResult.errors.length > 0 && (
            <div className="mt-3 border-2 border-border bg-muted px-3 py-2 font-mono text-[11px] text-destructive">
              ERROR: {syncResult.errors[0]}
            </div>
          )}
        </div>
      </section>

      <section className="border-2 border-border bg-card shadow-brut-md overflow-hidden mt-6">
        <header className="bg-ink text-cream px-3.5 py-2.5 flex justify-between items-baseline">
          <span className="font-display text-[16px] tracking-[-0.02em]">ACCESS TOKENS</span>
          <span className="font-mono text-[10px] tracking-[0.08em]">
            {tokens.length} ACTIVE
          </span>
        </header>

        {newToken && (
          <div className="m-4 border-2 border-border bg-pillar-ai shadow-brut-md p-4">
            <div className="font-display text-[12px] tracking-[0.12em] mb-2">
              NEW TOKEN — COPY IT NOW (YOU WON&apos;T SEE IT AGAIN)
            </div>
            <div className="font-mono text-[13px] bg-background border-2 border-border px-2 py-1.5 break-all">
              {newToken}
            </div>
            <Button onClick={handleCopy} className="mt-2">
              {copied ? "✓ COPIED" : "COPY"}
            </Button>
          </div>
        )}

        <div className="p-4 flex flex-col gap-2.5">
          {tokens.map((t) => (
            <div
              key={t.id}
              className="border-2 border-border bg-card shadow-brut-sm p-3 grid grid-cols-[1fr_auto] gap-2 items-center"
            >
              <div>
                <div className="font-display text-[12px] tracking-[-0.01em]">
                  {t.tokenPrefix || t.id.slice(0, 8)}…
                </div>
                <div className="font-mono text-[10px] opacity-65 mt-1">
                  CREATED {new Date(t.createdAt).toLocaleDateString()} ·
                  {t.lastUsedAt
                    ? ` LAST USED ${new Date(t.lastUsedAt).toLocaleString()}`
                    : " NEVER USED"}
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setRevokeTarget(t.id)}
              >
                REVOKE
              </Button>
            </div>
          ))}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="border-2 border-dashed border-border bg-transparent p-3 font-display text-[11px] tracking-[0.12em] uppercase flex justify-center items-center gap-1.5 hover:bg-muted disabled:opacity-50 cursor-pointer"
          >
            {creating ? TOKEN_STEPS[tokenStep].label.toUpperCase() : "+ MINT NEW TOKEN"}
          </button>
        </div>
      </section>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>REVOKE TOKEN</DialogTitle>
            <DialogDescription>
              This token will stop working immediately. Any integrations using it will lose access. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              CANCEL
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (revokeTarget) handleRevoke(revokeTarget);
                setRevokeTarget(null);
              }}
            >
              REVOKE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
