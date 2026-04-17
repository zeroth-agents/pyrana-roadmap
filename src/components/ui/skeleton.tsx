import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-2 border-ink bg-cream-2 hatch-ink opacity-25",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
