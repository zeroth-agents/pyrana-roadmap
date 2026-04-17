"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { getMonogram } from "@/lib/pillar-utils";

interface UserAvatarPopoverProps {
  name: string | null | undefined;
  email: string | null | undefined;
}

export function UserAvatarPopover({ name, email }: UserAvatarPopoverProps) {
  if (!name?.trim()) {
    return (
      <div className="flex h-10 w-10 items-center justify-center border-2 border-sidebar-foreground bg-cream-2 text-ink font-display text-[12px]">
        ??
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        className="flex h-10 w-10 items-center justify-center border-2 border-sidebar-foreground bg-pillar-pf text-ink font-display text-[12px] tracking-[-0.02em] hover:shadow-[2px_2px_0_var(--sidebar-foreground)] transition-shadow"
        title={name}
      >
        <span className="font-display text-[12px]">{getMonogram(name)}</span>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        className="w-56 bg-sidebar text-sidebar-foreground border-[2px] border-sidebar-foreground p-3"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold">{name}</p>
          {email && (
            <p className="text-xs text-sidebar-foreground/60">{email}</p>
          )}
        </div>
        <Separator className="my-2 bg-sidebar-foreground/30" />
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2 border-2 border-transparent hover:border-sidebar-foreground px-2 py-1.5 text-xs font-display uppercase tracking-[0.08em] transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
