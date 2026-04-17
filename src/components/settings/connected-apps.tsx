"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <section className="border-2 border-ink bg-cream shadow-brut-md overflow-hidden">
      <header className="bg-ink text-cream px-3.5 py-2.5 flex justify-between items-baseline">
        <span className="font-display text-[16px] tracking-[-0.02em]">CONNECTED APPS</span>
        <span className="font-mono text-[10px] tracking-[0.08em]">
          {!loading && `${items.length} CONNECTED`}
        </span>
      </header>
      <div className="p-4 flex flex-col gap-2.5">
        {loading && (
          <p className="font-mono text-[11px] opacity-60">LOADING…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="font-mono text-[11px] opacity-60">
            NO MCP CLIENTS ARE CURRENTLY CONNECTED TO YOUR ACCOUNT.
          </p>
        )}
        {items.map((item) => {
          const initial = item.name.charAt(0).toUpperCase();
          const isDrive = item.name.toLowerCase().includes("drive");
          return (
            <div
              key={item.clientId}
              className="border-2 border-ink bg-cream shadow-brut-sm p-3 grid grid-cols-[40px_1fr_auto] gap-3 items-center"
            >
              <div
                className={cn(
                  "h-10 w-10 border-2 border-ink font-display text-[14px] flex items-center justify-center shrink-0",
                  isDrive ? "bg-pillar-dc" : "bg-pillar-pf"
                )}
              >
                {initial}
              </div>
              <div>
                <div className="font-display text-[13px]">{item.name}</div>
                <div className="font-mono text-[10px] opacity-70 mt-0.5">
                  {item.registrationType === "dcr" ? "MCP CLIENT" : "MANUAL APP"}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => disconnect(item.clientId)}>
                DISCONNECT
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
