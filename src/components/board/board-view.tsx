"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragEndEvent,
} from "@dnd-kit/core";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { CapacityIndicator } from "./capacity-indicator";
import { InitiativeCard } from "./initiative-card";
import { LaneCell } from "./lane-cells";

interface Pillar {
  id: string;
  name: string;
  customerStory: string;
}

interface Initiative {
  id: string;
  title: string;
  size: string;
  why: string;
  dependsOn: string[];
  lane: string;
  pillarId: string;
  linearStatus?: string | null;
  linearAssignee?: string | null;
}

interface BoardViewProps {
  pillars: Pillar[];
  initiatives: Initiative[];
  proposalCounts: Record<string, number>;
  onReorder: (updates: Array<{
    id: string;
    sortOrder: number;
    lane?: string;
    pillarId?: string;
  }>) => void;
  onCardClick: (initiative: Initiative) => void;
}

const LANES = [
  { id: "now", label: "Now", droppable: true },
  { id: "next", label: "Next", droppable: true },
  { id: "done", label: "Done", droppable: false },
] as const;

export function BoardView({
  pillars,
  initiatives,
  proposalCounts,
  onReorder,
  onCardClick,
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const initiative = initiatives.find((i) => i.id === active.id);
    if (!initiative) return;

    const overId = over.id as string;
    let targetPillarId = initiative.pillarId;
    let targetLane = initiative.lane;

    if (overId.endsWith("-now")) {
      targetPillarId = overId.replace(/-now$/, "");
      targetLane = "now";
    } else if (overId.endsWith("-next")) {
      targetPillarId = overId.replace(/-next$/, "");
      targetLane = "next";
    }

    if (targetPillarId === initiative.pillarId && targetLane === initiative.lane) {
      setActiveId(null);
      return;
    }

    const targetLaneItems = initiatives
      .filter((i) => i.pillarId === targetPillarId && i.lane === targetLane && i.id !== initiative.id);

    const reorderUpdates = [
      { id: initiative.id, sortOrder: 0, lane: targetLane, pillarId: targetPillarId },
      ...targetLaneItems.map((item, idx) => ({
        id: item.id,
        sortOrder: idx + 1,
      })),
    ];

    onReorder(reorderUpdates);
    setActiveId(null);
  }

  const activeInitiative = activeId
    ? initiatives.find((i) => i.id === activeId)
    : null;

  const activePillarCount = pillars.filter((p) =>
    initiatives.some((i) => i.pillarId === p.id && i.lane === "now")
  ).length;

  const boardInitiatives = initiatives.filter(
    (i) => i.lane !== "backlog"
  );

  return (
    <TooltipProvider>
      <CapacityIndicator activePillarCount={activePillarCount} />
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div
          className="overflow-x-auto pb-4"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${pillars.length}, minmax(240px, 1fr))`,
            gap: "16px",
          }}
        >
          {/* Pillar headers */}
          {pillars.map((pillar) => (
            <div key={pillar.id} className="flex items-center justify-between pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                {pillar.name}
              </h3>
              {(proposalCounts[pillar.id] ?? 0) > 0 && (
                <Badge variant="secondary">{proposalCounts[pillar.id]}</Badge>
              )}
            </div>
          ))}

          {/* Lane rows */}
          {LANES.map((lane) => {
            const hasAnyItems = pillars.some((p) =>
              boardInitiatives.some((i) => i.pillarId === p.id && i.lane === lane.id)
            );
            if (lane.id === "done" && !hasAnyItems) return null;

            return [
              // Lane header row
              ...pillars.map((pillar, idx) => (
                <div
                  key={`${lane.id}-header-${pillar.id}`}
                  className="flex items-center gap-2 pt-2"
                >
                  {idx === 0 ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {lane.label}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </>
                  ) : (
                    <div className="h-px flex-1 bg-border" />
                  )}
                </div>
              )),
              // Lane card cells
              ...pillars.map((pillar) => (
                <LaneCell
                  key={`${lane.id}-${pillar.id}`}
                  pillarId={pillar.id}
                  lane={lane.id}
                  items={boardInitiatives.filter(
                    (i) => i.pillarId === pillar.id && i.lane === lane.id
                  )}
                  allInitiatives={initiatives}
                  onCardClick={onCardClick}
                  droppable={lane.droppable}
                />
              )),
            ];
          })}
        </div>
        <DragOverlay>
          {activeInitiative && (
            <InitiativeCard
              initiative={activeInitiative}
              allInitiatives={initiatives}
              onClick={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}
