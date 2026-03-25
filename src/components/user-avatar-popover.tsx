"use client";

import { signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface UserAvatarPopoverProps {
  name: string | null | undefined;
  email: string | null | undefined;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

export function UserAvatarPopover({ name, email }: UserAvatarPopoverProps) {
  if (!name?.trim()) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/50">
        <User className="h-4 w-4 text-white" />
      </div>
    );
  }

  const initials = getInitials(name);

  return (
    <Popover>
      <PopoverTrigger
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary transition-opacity hover:opacity-80"
        title={name}
      >
        <span className="text-[10px] font-semibold text-white">
          {initials}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        className="w-56 border-sidebar-border bg-sidebar p-3 text-sidebar-foreground"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold">{name}</p>
          {email && (
            <p className="text-xs text-sidebar-foreground/60">{email}</p>
          )}
        </div>
        <Separator className="my-2 bg-sidebar-border" />
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-primary/15 hover:text-primary"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
