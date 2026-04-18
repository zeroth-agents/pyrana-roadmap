"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getMonogram } from "@/lib/pillar-utils";

interface User {
  id: string;
  name: string;
}

interface AssigneeSelectProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  className?: string;
  /** Compact variant: single-line h-10 control with inline label, no stacked header. */
  compact?: boolean;
  /** Chip variant: sized to match adjacent Lane/Pillar/Size chips in a detail header. */
  chip?: boolean;
}

export function AssigneeSelect({ value, onChange, className, compact = false, chip = false }: AssigneeSelectProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error);
  }, []);

  if (chip) {
    return (
      <Select
        value={value ?? "unassigned"}
        onValueChange={(v) => onChange(v === "unassigned" ? null : v)}
      >
        <SelectTrigger
          className={cn(
            "h-auto! w-auto gap-1.5 border-2 border-border bg-background px-2.5 py-1 shadow-[2px_2px_0_var(--shadow-color)] flex items-center font-bold text-[11px] tracking-[0.04em] data-placeholder:text-muted-foreground",
            className
          )}
        >
          <span className="text-[8px] tracking-[0.2em] uppercase opacity-55 mr-0.5">Assignee</span>
          <SelectValue placeholder="Unassigned">
            {(val: string) => {
              if (val === "unassigned" || !val) {
                return <span className="font-bold text-[11px]">Unassigned</span>;
              }
              const user = users.find((u) => u.id === val);
              if (!user) return <span className="font-bold text-[11px]">Unassigned</span>;
              return (
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center border-[1.5px] border-ink bg-pillar-bx font-display text-[8px] text-ink">
                    {getMonogram(user.name)}
                  </span>
                  <span className="font-bold text-[11px]">{user.name}</span>
                </span>
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center border-[1.5px] border-border bg-pillar-bx font-display text-[9px] text-ink">
                  {getMonogram(u.name)}
                </span>
                {u.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (compact) {
    return (
      <Select
        value={value ?? "unassigned"}
        onValueChange={(v) => onChange(v === "unassigned" ? null : v)}
      >
        <SelectTrigger
          className={cn(
            "h-10 gap-1.5 border-2 border-foreground bg-background px-3 shadow-brut-sm",
            "flex items-center data-placeholder:text-muted-foreground",
            className
          )}
        >
          <span className="text-[8px] font-display uppercase tracking-[0.2em] opacity-55">
            Assignee
          </span>
          <SelectValue placeholder="Anyone">
            {(val: string) => {
              if (val === "unassigned" || !val) {
                return <span className="font-medium text-sm">Anyone</span>;
              }
              const user = users.find((u) => u.id === val);
              if (!user) return <span className="font-medium text-sm">Anyone</span>;
              return (
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center border-[1.5px] border-ink bg-pillar-bx font-display text-[9px] text-ink">
                    {getMonogram(user.name)}
                  </span>
                  <span className="font-medium text-sm">{user.name}</span>
                </span>
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Anyone</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center border-[1.5px] border-border bg-pillar-bx font-display text-[9px] text-ink">
                  {getMonogram(u.name)}
                </span>
                {u.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={value ?? "unassigned"}
      onValueChange={(v) => onChange(v === "unassigned" ? null : v)}
    >
      <SelectTrigger className={cn(
        "h-auto min-h-12 gap-2 border-2 border-foreground bg-background px-3 py-1.5 shadow-brut-sm",
        "flex items-center data-placeholder:text-muted-foreground",
        className
      )}>
        <div className="flex flex-1 flex-col items-start gap-1 min-w-0">
          <span className="text-[9px] font-display uppercase tracking-[0.18em] opacity-70 leading-none">
            Filter by assignee
          </span>
          <SelectValue placeholder="Anyone">
            {(val: string) => {
              if (val === "unassigned" || !val) {
                return <span className="font-display text-base leading-none">Anyone</span>;
              }
              const user = users.find((u) => u.id === val);
              if (!user) return <span className="font-display text-base leading-none">Anyone</span>;
              return (
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center border-2 border-border bg-pillar-bx font-display text-[11px] text-ink">
                    {getMonogram(user.name)}
                  </span>
                  <span className="font-display text-base leading-none">{user.name}</span>
                </div>
              );
            }}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Anyone</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center border-[1.5px] border-border bg-pillar-bx font-display text-[9px] text-ink">
                {getMonogram(u.name)}
              </span>
              {u.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
