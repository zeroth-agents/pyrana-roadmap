"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { InitiativeCard } from "./initiative-card";
import { Separator } from "@/components/ui/separator";

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
    <div className="flex w-64 flex-shrink-0 flex-col rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between p-3">
        <h3 className="text-sm font-semibold">{pillar.name}</h3>
        {pendingProposalCount > 0 && (
          <Badge variant="secondary">{pendingProposalCount}</Badge>
        )}
      </div>

      {/* Now section */}
      <div ref={setNowRef} className="min-h-[80px] px-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Now
        </span>
        <SortableContext
          items={nowItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-1 flex flex-col gap-2">
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

      <Separator className="my-2" />

      {/* Next section */}
      <div ref={setNextRef} className="min-h-[80px] px-2 pb-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Next
        </span>
        <SortableContext
          items={nextItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-1 flex flex-col gap-2">
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
