"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

const THEMES = ["system", "light", "dark"] as const;

const THEME_CONFIG = {
  system: { icon: Monitor, label: "Auto" },
  light: { icon: Sun, label: "Light" },
  dark: { icon: Moon, label: "Dark" },
} as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center border-2 border-sidebar-foreground/30">
        <Monitor className="h-4 w-4 text-sidebar-foreground/30" />
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
      className={[
        "flex h-10 w-10 items-center justify-center border-2 border-sidebar-foreground bg-transparent text-sidebar-foreground hover:bg-sidebar-foreground hover:text-sidebar transition-colors [&_svg]:h-4 [&_svg]:w-4",
        current !== "system" ? "shadow-[2px_2px_0_var(--pillar-ai)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={`Theme: ${config.label}. Click to switch.`}
    >
      <Icon />
    </button>
  );
}
