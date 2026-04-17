"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { getPillarSlug, getMonogram } from "@/lib/pillar-utils";

interface Initiative {
  id: string;
  title: string;
  description: string;
  content: string;
  size: string;
  why: string;
  dependsOn: string[];
  lane: string;
  pillarId: string;
  linearProjectId?: string | null;
  issueCountTotal?: number;
  issueCountDone?: number;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

interface InitiativeCardProps {
  initiative: Initiative;
  onClick: () => void;
  allInitiatives: Initiative[];
  pillarName?: string;
}

const SIZE_BG: Record<string, string> = {
  S: "bg-pillar-bx",
  M: "bg-pillar-ai",
  L: "bg-pillar-ac",
};

export function InitiativeCard({
  initiative,
  onClick,
  pillarName,
}: InitiativeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: initiative.id, data: initiative });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const pillarSlug = getPillarSlug(pillarName);
  const total = initiative.issueCountTotal ?? 0;
  const done = initiative.issueCountDone ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : null;
  const why = initiative.why || initiative.description || initiative.content;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "cursor-pointer border-2 border-ink shadow-brut-sm transition-transform",
          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--shadow-color)]",
          isDragging && "cursor-grabbing opacity-80"
        )}
        style={{
          backgroundColor: `color-mix(in oklab, var(--pillar-${pillarSlug}) 22%, var(--cream))`,
        }}
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        <div className="px-2.5 py-2">
          {/* Top row: title + size */}
          <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
            <h3 className="font-sans font-extrabold text-[13px] leading-[1.2] tracking-[-0.01em]">
              {initiative.title}
            </h3>
            <div
              className={cn(
                "h-[26px] w-[26px] border-2 border-ink flex items-center justify-center font-display text-[15px]",
                SIZE_BG[initiative.size] ?? "bg-ink text-cream"
              )}
            >
              {initiative.size}
            </div>
          </div>

          {/* Why */}
          {why && (
            <p className="text-[10.5px] leading-[1.35] mt-1.5 text-ink-soft line-clamp-2">
              {why}
            </p>
          )}

          {/* Progress */}
          {total > 0 && pct !== null && (
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 items-center">
              <div className="h-2 border-2 border-ink bg-cream-2 overflow-hidden">
                <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
              </div>
              <span className="font-display text-[12px] tracking-[-0.03em] leading-none min-w-[34px] text-right">
                {pct}%
              </span>
            </div>
          )}

          {/* Footer: assignee */}
          {initiative.assigneeName && (
            <div className="mt-2 flex items-center gap-1.5 border-t-[1.5px] border-ink pt-1.5">
              <div
                className={cn(
                  "h-5 w-5 border-[1.5px] border-ink font-display text-[9px] flex items-center justify-center",
                  `bg-pillar-${pillarSlug}`
                )}
              >
                {getMonogram(initiative.assigneeName)}
              </div>
              <span className="text-[10px] font-bold">{initiative.assigneeName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
