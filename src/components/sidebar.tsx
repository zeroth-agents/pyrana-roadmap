"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatarPopover } from "@/components/user-avatar-popover";
import { Logo } from "@/components/logo";

interface SidebarProps {
  openIdeaCount: number;
  userName: string | null;
  userEmail: string | null;
}

const NAV_ITEMS = [
  { href: "/", label: "Board", abbr: "BD" },
  { href: "/table", label: "Table", abbr: "TB" },
  { href: "/ideas", label: "Ideas", abbr: "ID" },
  { href: "/settings", label: "Settings", abbr: "SX" },
];

export function Sidebar({ openIdeaCount, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[72px] flex-col items-center bg-sidebar py-4 border-r-[3px] border-sidebar-border">
      {/* Logo — unframed, inherits cream from parent color */}
      <div className="mb-6 text-sidebar-foreground">
        <Logo variant="unframed" size={40} className="block" />
      </div>

      <nav className="flex flex-col items-center gap-2 w-full px-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center border-2 font-display text-[13px] tracking-[-0.05em] uppercase transition-transform",
                isActive
                  ? "border-sidebar-foreground bg-sidebar-foreground text-ink shadow-[3px_3px_0_var(--pillar-ai)]"
                  : "border-sidebar-foreground/60 bg-transparent text-sidebar-foreground hover:border-sidebar-foreground hover:shadow-[2px_2px_0_var(--sidebar-foreground)]"
              )}
            >
              <span aria-hidden>{item.abbr}</span>
              {item.label === "Ideas" && openIdeaCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center border-2 border-sidebar-foreground bg-destructive px-1 font-display text-[10px] text-ink"
                >
                  {openIdeaCount}
                </span>
              )}
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3 pb-1">
        <ThemeToggle />
        <UserAvatarPopover name={userName} email={userEmail} />
      </div>
    </aside>
  );
}
