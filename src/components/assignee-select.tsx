"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string;
}

interface AssigneeSelectProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AssigneeSelect({ value, onChange, className }: AssigneeSelectProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error);
  }, []);

  return (
    <Select
      value={value ?? "unassigned"}
      onValueChange={(v) => onChange(v === "unassigned" ? null : v)}
    >
      <SelectTrigger className={className ?? "h-7 w-auto gap-1 rounded-full bg-muted/50 border-0 px-3 text-xs"}>
        <SelectValue placeholder="Unassigned">
          {(val: string) => {
            if (val === "unassigned") return "Unassigned";
            const user = users.find((u) => u.id === val);
            if (!user) return "Unassigned";
            return (
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] font-semibold text-primary-foreground">
                  {getInitials(user.name)}
                </span>
                {user.name}
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
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[8px] font-semibold text-primary-foreground">
                {getInitials(u.name)}
              </span>
              {u.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
