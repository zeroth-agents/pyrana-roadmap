"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [writeScope, setWriteScope] = useState(false);
  const [newSecret, setNewSecret] = useState<{ clientId: string; clientSecret: string } | null>(null);

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
        scopes: writeScope ? ["read", "write"] : ["read"],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewSecret({ clientId: data.client_id, clientSecret: data.client_secret });
      setName("");
      setRedirects("");
      setWriteScope(false);
      load();
    }
  }

  async function remove(clientId: string) {
    if (!confirm(`Delete ${clientId}?`)) return;
    const res = await fetch(`/api/oauth/clients/${clientId}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Your OAuth apps</h2>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="mb-4 text-sm text-muted-foreground">No manual OAuth apps yet.</p>
        )}
        {items.map((item) => (
          <div
            key={item.clientId}
            className="flex items-center justify-between border-b border-border py-2 last:border-b-0"
          >
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{item.clientId}</p>
              <p className="text-xs text-muted-foreground">
                Secret: {item.clientSecretPrefix}… · Scopes: {item.scopes.join(", ")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => remove(item.clientId)}>
              Delete
            </Button>
          </div>
        ))}

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">New OAuth app</p>
          <Input placeholder="App name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea
            className="w-full rounded border border-border bg-background p-2 text-sm"
            rows={3}
            placeholder="Redirect URIs (one per line)"
            value={redirects}
            onChange={(e) => setRedirects(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={writeScope}
              onChange={(e) => setWriteScope(e.target.checked)}
            />
            Grant write scope
          </label>
          <Button onClick={create}>Create app</Button>
        </div>

        <Dialog open={!!newSecret} onOpenChange={(o) => !o && setNewSecret(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Copy your client secret</DialogTitle>
              <DialogDescription>
                This is the only time the secret will be shown. Store it securely.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Client ID</p>
              <p className="rounded bg-muted p-2 font-mono text-xs">{newSecret?.clientId}</p>
              <p className="text-xs text-muted-foreground">Client Secret</p>
              <p className="rounded bg-muted p-2 font-mono text-xs break-all">
                {newSecret?.clientSecret}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewSecret(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
