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
import { CapacityIndicator } from "./capacity-indicator";
import { AssigneeSelect } from "@/components/assignee-select";
import { cn } from "@/lib/utils";

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
  assigneeFilter: string | null;
  onAssigneeFilterChange: (v: string | null) => void;
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
  assigneeFilter,
  onAssigneeFilterChange,
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

  const activePillarCount = new Set(
    initiatives.filter((i) => i.lane === "now").map((i) => i.pillarId)
  ).size;

  const quarterLabel = (() => {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} · ${d.getFullYear()}`;
  })();

  return (
    <TooltipProvider>
      {/* Top strip: title + capacity gauge + assignee chip */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-stretch mb-4">
        <h1 className="font-display text-[44px] leading-[0.95] tracking-[-0.045em] border-b-[3px] border-ink pb-1.5 flex items-baseline gap-3">
          THE&nbsp;ROADMAP
          <span className="bg-ink text-cream font-sans text-[11px] font-semibold tracking-[0.12em] px-2 py-0.5 self-center translate-y-[-6px]">
            {quarterLabel}
          </span>
        </h1>
        <CapacityIndicator activePillarCount={activePillarCount} />
        <AssigneeSelect
          value={assigneeFilter}
          onChange={onAssigneeFilterChange}
          className="w-[200px]"
        />
      </div>

      {/* Lane toggles row */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-[10px] font-display uppercase tracking-[0.2em] text-ink-soft">
          Show →
        </span>
        <button
          onClick={() => setShowBacklog(!showBacklog)}
          className={cn(
            "border-2 border-ink px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-1.5 transition-colors",
            showBacklog ? "bg-ink text-cream" : "bg-transparent text-ink"
          )}
        >
          Backlog
          {backlogCount > 0 && (
            <span className="border-[1.5px] border-ink bg-cream text-ink px-1 text-[10px] font-display leading-[1.4]">
              {backlogCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowDone(!showDone)}
          className={cn(
            "border-2 border-ink px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-1.5 transition-colors",
            showDone ? "bg-ink text-cream" : "bg-transparent text-ink"
          )}
        >
          Done
          {doneCount > 0 && (
            <span className="border-[1.5px] border-ink bg-cream text-ink px-1 text-[10px] font-display leading-[1.4]">
              {doneCount}
            </span>
          )}
        </button>
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
            gridTemplateColumns: `44px repeat(${pillars.length}, minmax(240px, 1fr))`,
            gap: "14px",
          }}
        >
          {/* Leading gutter cell under the title row */}
          <div aria-hidden />
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
              // Gutter cell with rotated lane label
              <div
                key={`${lane.id}-gutter`}
                className="flex flex-col items-end justify-end border-r-[3px] border-ink pb-3 -mr-2"
              >
                <span
                  aria-hidden
                  className="font-display text-[28px] leading-[0.9] tracking-[0.04em] uppercase"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  {lane.label}
                </span>
                <span className="sr-only">Lane: {lane.label}</span>
              </div>,
              // Lane card cells across pillars
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
              // Full-width divider rule after the lane
              <div
                key={`${lane.id}-divider`}
                aria-hidden
                style={{ gridColumn: "1 / -1", borderTop: "3px solid var(--ink)", height: 0, marginTop: "2px" }}
              />,
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
