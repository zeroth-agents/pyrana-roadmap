const KNOWN_SLUGS: Record<string, "ai" | "ac" | "dc" | "bx" | "pf"> = {
  "Agent Intelligence": "ai",
  "Agent Collaboration": "ac",
  "Data & Compute": "dc",
  "Builder Experience": "bx",
  "Platform Foundation": "pf",
};

const KNOWN_ABBRS: Record<string, string> = {
  "Agent Intelligence": "AI",
  "Agent Collaboration": "AC",
  "Data & Compute": "DC",
  "Builder Experience": "BX",
  "Platform Foundation": "PF",
};

export type PillarSlug = "ai" | "ac" | "dc" | "bx" | "pf";

export function getPillarAbbr(name: string | undefined): string {
  if (!name) return "??";
  if (KNOWN_ABBRS[name]) return KNOWN_ABBRS[name];
  const words = name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function getPillarSlug(name: string | undefined): PillarSlug {
  if (!name) return "pf";
  return KNOWN_SLUGS[name] ?? "pf";
}

export function getPillarColorClass(name: string | undefined): string {
  return `bg-pillar-${getPillarSlug(name)}`;
}

export function getMonogram(name: string | undefined): string {
  if (!name) return "??";
  const words = name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
