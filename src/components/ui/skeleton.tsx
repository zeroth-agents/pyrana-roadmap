import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-2 border-border bg-muted hatch-ink opacity-25",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
