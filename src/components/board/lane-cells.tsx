"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { InitiativeCard } from "./initiative-card";

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
}

interface LaneCellProps {
  pillarId: string;
  lane: string;
  items: Initiative[];
  allInitiatives: Initiative[];
  onCardClick: (initiative: Initiative) => void;
  droppable?: boolean;
}

export function LaneCell({
  pillarId,
  lane,
  items,
  allInitiatives,
  onCardClick,
  droppable = true,
}: LaneCellProps) {
  const { setNodeRef } = useDroppable({
    id: droppable ? `${pillarId}-${lane}` : `${pillarId}-${lane}-readonly`,
  });

  return (
    <div ref={setNodeRef} className="min-h-[60px]">
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {items.map((initiative) => (
            <InitiativeCard
              key={initiative.id}
              initiative={initiative}
              allInitiatives={allInitiatives}
              onClick={() => onCardClick(initiative)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
