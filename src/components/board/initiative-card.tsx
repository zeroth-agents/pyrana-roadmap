"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  linearStatus?: string | null;
  linearAssignee?: string | null;
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
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: initiative.id, data: initiative });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const depNames = initiative.dependsOn
    .map((id) => allInitiatives.find((i) => i.id === id)?.title)
    .filter(Boolean);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium leading-tight">
              {initiative.title}
            </span>
            <Badge variant="outline" className={SIZE_COLORS[initiative.size]}>
              {initiative.size}
            </Badge>
          </div>
          {initiative.why && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {initiative.why}
            </p>
          )}
          {depNames.length > 0 && (
            <Tooltip>
              <TooltipTrigger
                className="mt-1.5 inline-block h-2 w-2 rounded-full bg-orange-400"
              />
              <TooltipContent>
                Depends on: {depNames.join(", ")}
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
