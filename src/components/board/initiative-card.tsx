"use client";

import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Initiative {
  id: string;
  title: string;
  size: string;
  why: string;
  dependsOn: string[];
  lane: string;
  pillarId: string;
  linearProjectId?: string | null;
  issueCountTotal?: number;
  issueCountDone?: number;
}

interface InitiativeCardProps {
  initiative: Initiative;
  onClick: () => void;
  allInitiatives: Initiative[];
}

const SIZE_COLORS: Record<string, string> = {
  S: "bg-green-100 text-green-700",
  M: "bg-yellow-100 text-yellow-700",
  L: "bg-red-100 text-red-700",
};

export function InitiativeCard({
  initiative,
  onClick,
  allInitiatives,
}: InitiativeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: initiative.id, data: initiative });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const depNames = initiative.dependsOn
    .map((id) => allInitiatives.find((i) => i.id === id)?.title)
    .filter(Boolean);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    listeners?.onPointerDown?.(e as any);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStart.current) {
      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
        onClick();
      }
    }
    pointerStart.current = null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div
        className="cursor-pointer overflow-hidden rounded-lg bg-card shadow-[0_2px_8px_rgba(57,65,80,0.08)] transition-shadow hover:shadow-md dark:border dark:border-border"
      >
        {/* Slate header */}
        <div className="flex items-center justify-between bg-card-header px-2.5 py-1.5">
          <span className="truncate text-xs font-semibold text-card-header-foreground">
            {initiative.title}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "ml-2 shrink-0 border-0 text-[10px]",
              SIZE_COLORS[initiative.size]
            )}
          >
            {initiative.size}
          </Badge>
        </div>

        {/* Card body */}
        <div className="px-2.5 py-2">
          {initiative.why && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {initiative.why}
            </p>
          )}

          {/* Progress bar */}
          {(initiative.issueCountTotal ?? 0) > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.round(((initiative.issueCountDone ?? 0) / (initiative.issueCountTotal ?? 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {initiative.issueCountDone ?? 0}/{initiative.issueCountTotal ?? 0}
              </span>
            </div>
          )}

          {/* Dependency indicator */}
          {depNames.length > 0 && (
            <div className="mt-2">
              <Tooltip>
                <TooltipTrigger className="inline-block h-2 w-2 rounded-full bg-primary/60" />
                <TooltipContent>
                  Depends on: {depNames.join(", ")}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
