"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const THEMES = ["system", "light", "dark"] as const;

const THEME_CONFIG = {
  system: { icon: Monitor, label: "Auto" },
  light: { icon: Sun, label: "Light" },
  dark: { icon: Moon, label: "Dark" },
} as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-[42px] w-[42px] items-center justify-center">
        <Monitor className="h-4 w-4 text-white/35" />
      </div>
    );
  }

  const current = (theme ?? "system") as (typeof THEMES)[number];
  const nextIndex = (THEMES.indexOf(current) + 1) % THEMES.length;
  const config = THEME_CONFIG[current];
  const Icon = config.icon;

  return (
    <button
      onClick={() => setTheme(THEMES[nextIndex])}
      className={cn(
        "flex h-[42px] w-[42px] flex-col items-center justify-center gap-0.5 rounded-lg transition-colors",
        current !== "system"
          ? "bg-sidebar-active text-primary"
          : "text-white/35 hover:text-white/60"
      )}
      title={`Theme: ${config.label}. Click to switch.`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[6px] font-semibold">{config.label}</span>
    </button>
  );
}
