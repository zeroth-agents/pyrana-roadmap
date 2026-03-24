"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Token {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function SettingsPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/tokens").then((r) => r.json()).then(setTokens);
  }, []);

  async function handleCreate() {
    setCreating(true);
    const res = await fetch("/api/tokens", { method: "POST" });
    const data = await res.json();
    setNewToken(data.token);
    setCreating(false);
    const updated = await fetch("/api/tokens").then((r) => r.json());
    setTokens(updated);
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    const updated = await fetch("/api/tokens").then((r) => r.json());
    setTokens(updated);
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>

      <h2 className="mb-2 text-lg font-medium">Linear Sync</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Pull latest project data from Linear — descriptions, leads, issue counts, and statuses.
      </p>
      <div className="mb-8 flex items-center gap-3">
        <Button
          onClick={async () => {
            setSyncing(true);
            setSyncResult(null);
            try {
              const res = await fetch("/api/sync/linear", { method: "POST" });
              const data = await res.json();
              setSyncResult(data);
            } catch {
              setSyncResult({ created: 0, updated: 0, errors: ["Sync request failed"] });
            }
            setSyncing(false);
          }}
          disabled={syncing}
        >
          {syncing ? "Syncing..." : "Sync from Linear"}
        </Button>
        {syncResult && (
          <span className="text-sm text-muted-foreground">
            {syncResult.errors.length > 0
              ? `Error: ${syncResult.errors[0]}`
              : `${syncResult.created} created, ${syncResult.updated} updated`}
          </span>
        )}
      </div>

      <h2 className="mb-2 text-lg font-medium">API Tokens</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Personal access tokens for the Claude Code skill. Store in Azure Key
        Vault and set as ROADMAP_API_TOKEN.
      </p>

      {newToken && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-medium text-green-800">
              Token created. Copy it now — it won&apos;t be shown again.
            </p>
            <Input value={newToken} readOnly className="font-mono text-xs" />
          </CardContent>
        </Card>
      )}

      <Button onClick={handleCreate} disabled={creating} className="mb-4">
        Generate New Token
      </Button>

      <div className="space-y-2">
        {tokens.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-center justify-between p-3">
              <div className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {t.id.slice(0, 8)}...
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
                onClick={() => handleRevoke(t.id)}
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
    </div>
  );
}
