import { cn } from "@/lib/utils"

interface CapacityIndicatorProps {
  activePillarCount: number
  totalPillars?: number
  className?: string
}

export function CapacityIndicator({
  activePillarCount,
  totalPillars = 5,
  className,
}: CapacityIndicatorProps) {
  const overCapacity = activePillarCount > 3
  const state = overCapacity ? "warn" : "ok"

  return (
    <div
      data-state={state}
      className={cn(
        "border-2 border-ink px-4 py-2 shadow-brut-sm flex flex-col min-w-[170px]",
        overCapacity ? "hatch-warn" : "bg-cream-2",
        className
      )}
    >
      <span className="text-[9px] font-display uppercase tracking-[0.18em]">
        Now pressure
      </span>
      <span className="font-display text-[28px] leading-none tracking-[-0.04em] flex items-baseline gap-1.5">
        <span>{activePillarCount}</span>
        <span className="opacity-40 font-sans font-normal">/</span>
        <span className="text-sm opacity-60 font-sans font-medium">
          {totalPillars} pillars · cap 3
        </span>
      </span>
      {overCapacity && (
        <span className="text-[9px] font-display uppercase tracking-[0.1em] mt-1">
          ▲ over capacity
        </span>
      )}
    </div>
  )
}
