"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Connected {
  clientId: string;
  name: string;
  registrationType: string;
}

export function ConnectedApps() {
  const [items, setItems] = useState<Connected[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/oauth/clients");
    if (res.ok) {
      const data = await res.json();
      setItems(data.connected);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const res = await fetch("/api/oauth/clients");
      if (res.ok) {
        const data = await res.json();
        setItems(data.connected);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function disconnect(clientId: string) {
    if (!confirm(`Disconnect ${clientId}?`)) return;
    const res = await fetch(`/api/oauth/clients/${clientId}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Connected apps</h2>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No MCP clients are currently connected to your account.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.clientId}
            className="flex items-center justify-between border-b border-border py-2 last:border-b-0"
          >
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.registrationType === "dcr" ? "MCP client" : "Manual app"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => disconnect(item.clientId)}>
              Disconnect
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
