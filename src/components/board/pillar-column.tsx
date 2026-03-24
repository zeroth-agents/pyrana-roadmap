"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
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

interface PillarColumnProps {
  pillar: Pillar;
  initiatives: Initiative[];
  allInitiatives: Initiative[];
  pendingProposalCount: number;
  onCardClick: (initiative: Initiative) => void;
}

export function PillarColumn({
  pillar,
  initiatives,
  allInitiatives,
  pendingProposalCount,
  onCardClick,
}: PillarColumnProps) {
  const nowItems = initiatives.filter((i) => i.lane === "now");
  const nextItems = initiatives.filter((i) => i.lane === "next");

  const { setNodeRef: setNowRef } = useDroppable({
    id: `${pillar.id}-now`,
  });
  const { setNodeRef: setNextRef } = useDroppable({
    id: `${pillar.id}-next`,
  });

  return (
    <div className="flex w-64 flex-shrink-0 flex-col">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
          {pillar.name}
        </h3>
        {pendingProposalCount > 0 && (
          <Badge variant="secondary">{pendingProposalCount}</Badge>
        )}
      </div>

      {/* Now section */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Now
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div ref={setNowRef} className="min-h-[80px]">
        <SortableContext
          items={nowItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {nowItems.map((initiative) => (
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

      {/* Next section */}
      <div className="mb-2 mt-4 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Next
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div ref={setNextRef} className="min-h-[80px] pb-3">
        <SortableContext
          items={nextItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {nextItems.map((initiative) => (
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
    </div>
  );
}
