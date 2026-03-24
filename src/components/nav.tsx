"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavProps {
  pendingProposalCount: number;
}

const NAV_ITEMS = [
  { href: "/", label: "Board" },
  { href: "/table", label: "Table" },
  { href: "/proposals", label: "Proposals" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ pendingProposalCount }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <span className="text-lg font-semibold">Pyrana Roadmap</span>
        <div className="flex gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
              {item.label === "Proposals" && pendingProposalCount > 0 && (
                <Badge variant="destructive" className="ml-1.5">
                  {pendingProposalCount}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
