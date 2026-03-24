"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragEndEvent,
} from "@dnd-kit/core";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PillarColumn } from "./pillar-column";
import { CapacityIndicator } from "./capacity-indicator";
import { InitiativeCard } from "./initiative-card";

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

    // Parse the droppable ID: "{pillarId}-{lane}"
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

    // Place the moved card at top of the target lane, then re-index
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

  return (
    <TooltipProvider>
      <CapacityIndicator activePillarCount={activePillarCount} />
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pillars.map((pillar) => (
            <PillarColumn
              key={pillar.id}
              pillar={pillar}
              initiatives={initiatives.filter(
                (i) => i.pillarId === pillar.id && i.lane !== "backlog" && i.lane !== "done"
              )}
              allInitiatives={initiatives}
              pendingProposalCount={proposalCounts[pillar.id] ?? 0}
              onCardClick={onCardClick}
            />
          ))}
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
