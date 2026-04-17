export type PillarSlug = "ai" | "ac" | "dc" | "bx" | "pf";

const PILLAR_MAP: Record<string, { slug: PillarSlug; abbr: string }> = {
  "Agent Intelligence":  { slug: "ai", abbr: "AI" },
  "Agent Collaboration": { slug: "ac", abbr: "AC" },
  "Data & Compute":      { slug: "dc", abbr: "DC" },
  "Builder Experience":  { slug: "bx", abbr: "BX" },
  "Platform Foundation": { slug: "pf", abbr: "PF" },
};

function splitWords(name: string): string[] {
  return name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
}

function fallbackInitials(name: string): string {
  const words = splitWords(name);
  if (words.length === 0) return "??";
  if (words.length === 1) {
    const w = words[0];
    return (w.length >= 2 ? w.slice(0, 2) : w + w).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function getPillarAbbr(name: string | undefined): string {
  if (!name) return "??";
  return PILLAR_MAP[name]?.abbr ?? fallbackInitials(name);
}

export function getPillarSlug(name: string | undefined): PillarSlug {
  if (!name) return "pf";
  return PILLAR_MAP[name]?.slug ?? "pf";
}

export function getPillarColorClass(name: string | undefined): string {
  return `bg-pillar-${getPillarSlug(name)}`;
}

export function getMonogram(name: string | undefined): string {
  if (!name) return "??";
  return fallbackInitials(name);
}
