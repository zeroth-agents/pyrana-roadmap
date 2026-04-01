"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  description: string;
  content: string;
  milestones: string;
  size: string;
  why: string;
  dependsOn: string[];
  lane: string;
  pillarId: string;
  linearStatus?: string | null;
  linearAssignee?: string | null;
  linearProjectId?: string | null;
  linearProjectLead?: string | null;
  issueCountTotal?: number;
  issueCountDone?: number;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

interface BoardViewProps {
  pillars: Pillar[];
  initiatives: Initiative[];
  onReorder: (updates: Array<{
    id: string;
    sortOrder: number;
    lane?: string;
    pillarId?: string;
  }>) => void;
  onCardClick: (initiative: Initiative) => void;
}

const ALWAYS_VISIBLE_LANES = [
  { id: "now", label: "Now", droppable: true },
  { id: "next", label: "Next", droppable: true },
] as const;

const OPTIONAL_LANES = [
  { id: "backlog", label: "Backlog", droppable: true },
  { id: "done", label: "Done", droppable: false },
] as const;

export function BoardView({
  pillars,
  initiatives,
  onReorder,
  onCardClick,
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showBacklog, setShowBacklog] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const initiative = initiatives.find((i) => i.id === active.id);
    if (!initiative) return;

    const overId = over.id as string;
    let targetPillarId = initiative.pillarId;
    let targetLane = initiative.lane;

    // Check if dropped on a lane container (format: "{pillarId}-{lane}")
    const laneMatch = overId.match(/^(.+)-(now|next|backlog|done)$/);
    if (laneMatch) {
      targetPillarId = laneMatch[1];
      targetLane = laneMatch[2];
    } else {
      // Dropped on another card — resolve that card's lane and pillar
      const overInitiative = initiatives.find((i) => i.id === overId);
      if (overInitiative) {
        targetPillarId = overInitiative.pillarId;
        targetLane = overInitiative.lane;
      }
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


  const visibleLaneIds = new Set(["now", "next"]);
  if (showBacklog) visibleLaneIds.add("backlog");
  if (showDone) visibleLaneIds.add("done");

  const visibleLanes = [
    ...ALWAYS_VISIBLE_LANES,
    ...OPTIONAL_LANES.filter((l) => visibleLaneIds.has(l.id)),
  ];

  const boardInitiatives = initiatives.filter((i) => visibleLaneIds.has(i.lane));

  const backlogCount = initiatives.filter((i) => i.lane === "backlog").length;
  const doneCount = initiatives.filter((i) => i.lane === "done").length;

  return (
    <TooltipProvider>
      <div className="mb-3 flex items-center gap-2">
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowBacklog(!showBacklog)}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              showBacklog
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Backlog{backlogCount > 0 ? ` (${backlogCount})` : ""}
          </button>
          <button
            onClick={() => setShowDone(!showDone)}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              showDone
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Done{doneCount > 0 ? ` (${doneCount})` : ""}
          </button>
        </div>
      </div>
      <DndContext
        sensors={sensors}
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
            </div>
          ))}

          {/* Lane rows */}
          {visibleLanes.map((lane) => {
            const hasAnyItems = pillars.some((p) =>
              boardInitiatives.some((i) => i.pillarId === p.id && i.lane === lane.id)
            );
            if ((lane.id === "done" || lane.id === "backlog") && !hasAnyItems) return null;

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
