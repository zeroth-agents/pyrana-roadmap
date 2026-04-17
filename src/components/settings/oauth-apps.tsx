"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function CopyableField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="font-display text-[10px] tracking-[0.15em] uppercase mb-1">{label}</div>
      <div
        className={`font-mono text-[13px] border-2 border-border px-2 py-1.5 break-all ${
          highlight ? "bg-pillar-ai" : "bg-muted"
        }`}
      >
        {value}
      </div>
      <Button size="sm" onClick={copy} className="mt-2">
        {copied ? "✓ COPIED" : "COPY"}
      </Button>
    </div>
  );
}

interface Manual {
  clientId: string;
  name: string;
  redirectUris: string[];
  scopes: string[];
  clientSecretPrefix: string;
  createdAt: string;
}

export function OauthApps() {
  const [items, setItems] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [redirects, setRedirects] = useState("");
  const [newSecret, setNewSecret] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/oauth/clients");
    if (res.ok) {
      const data = await res.json();
      setItems(data.manual);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const res = await fetch("/api/oauth/clients");
      if (res.ok) {
        const data = await res.json();
        setItems(data.manual);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function create() {
    const redirect_uris = redirects
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!name || redirect_uris.length === 0) return;
    const res = await fetch("/api/oauth/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        redirect_uris,
        scopes: ["read", "write"],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewSecret({ clientId: data.client_id, clientSecret: data.client_secret });
      setName("");
      setRedirects("");
      setCreateOpen(false);
      load();
    }
  }

  async function remove(clientId: string) {
    if (!confirm(`Delete ${clientId}?`)) return;
    const res = await fetch(`/api/oauth/clients/${clientId}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <section className="border-2 border-border bg-card shadow-brut-md overflow-hidden">
      <header className="bg-ink text-cream px-3.5 py-2.5 flex justify-between items-baseline">
        <span className="font-display text-[16px] tracking-[-0.02em]">OAUTH APPS</span>
        <span className="font-mono text-[10px] tracking-[0.08em]">
          {!loading && `${items.length} CLIENT${items.length === 1 ? "" : "S"}`}
        </span>
      </header>

      <div className="p-4 flex flex-col gap-2.5">
        {loading && (
          <p className="font-mono text-[11px] opacity-60">LOADING…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="font-mono text-[11px] opacity-60 mb-0">NO MANUAL OAUTH APPS YET.</p>
        )}
        {items.map((item) => (
          <div
            key={item.clientId}
            className="border-2 border-border bg-card shadow-brut-sm p-3 grid grid-cols-[1fr_auto] gap-2 items-center"
          >
            <div>
              <div className="font-display text-[12px]">{item.name}</div>
              <div className="font-mono text-[10px] opacity-70 mt-0.5">
                {item.clientId}
              </div>
              <div className="font-mono text-[9px] opacity-55 mt-0.5">
                CREATED {new Date(item.createdAt).toLocaleDateString()} · SECRET: {item.clientSecretPrefix}… · SCOPES: {item.scopes.join(", ").toUpperCase()}
              </div>
            </div>
            <Button variant="destructive" onClick={() => remove(item.clientId)}>
              REVOKE
            </Button>
          </div>
        ))}

        <button
          onClick={() => setCreateOpen(true)}
          className="border-2 border-dashed border-border bg-transparent p-3 font-display text-[11px] tracking-[0.12em] uppercase flex justify-center items-center gap-1.5 hover:bg-muted cursor-pointer"
        >
          + CREATE OAUTH APP
        </button>
      </div>

      {/* Create app dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setCreateOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CREATE OAUTH APP</DialogTitle>
            <DialogDescription>
              Grants read + write access to the roadmap.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="font-display text-[10px] tracking-[0.15em] uppercase mb-1">App Name</div>
              <Input
                placeholder="My MCP client"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <div className="font-display text-[10px] tracking-[0.15em] uppercase mb-1">Redirect URIs (one per line)</div>
              <textarea
                className="w-full border-2 border-border bg-muted p-2 font-mono text-[12px] resize-y"
                rows={3}
                placeholder="https://example.com/callback"
                value={redirects}
                onChange={(e) => setRedirects(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              CANCEL
            </Button>
            <Button onClick={create} disabled={!name || !redirects.trim()}>
              CREATE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal secret dialog */}
      <Dialog open={!!newSecret} onOpenChange={(o) => !o && setNewSecret(null)}>
        <DialogContent className="w-[min(640px,calc(100vw-2rem))] max-w-[640px]">
          <DialogHeader>
            <DialogTitle>OAUTH APP CREATED</DialogTitle>
            <DialogDescription>
              Copy both. Secret is never shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {newSecret && (
              <>
                <CopyableField label="Client ID" value={newSecret.clientId} />
                <CopyableField label="Client Secret" value={newSecret.clientSecret} highlight />
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>DONE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
