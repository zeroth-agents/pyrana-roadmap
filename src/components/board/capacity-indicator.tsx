import { cn } from "@/lib/utils";

interface CapacityIndicatorProps {
  activePillarCount: number;
}

export function CapacityIndicator({
  activePillarCount,
}: CapacityIndicatorProps) {
  const color =
    activePillarCount > 3
      ? "bg-red-100 text-red-700 border-red-200"
      : activePillarCount === 3
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-green-100 text-green-700 border-green-200";

  return (
    <div className={cn("rounded-md border px-3 py-2 text-sm", color)}>
      <strong>{activePillarCount}</strong> of 5 pillars have active Now work
      {activePillarCount > 3 && " — over the 3-pillar capacity constraint"}
    </div>
  );
}
