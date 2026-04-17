import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { CapacityIndicator } from "@/components/board/capacity-indicator"

describe("CapacityIndicator", () => {
  it("renders active pillar count and the total", () => {
    render(<CapacityIndicator activePillarCount={2} />)
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText(/5 pillars/i)).toBeInTheDocument()
  })

  it("uses data-state='ok' when count <= 3", () => {
    const { container } = render(<CapacityIndicator activePillarCount={3} />)
    expect(container.querySelector('[data-state="ok"]')).toBeInTheDocument()
    expect(container.querySelector('[data-state="warn"]')).toBeNull()
  })

  it("uses data-state='warn' when count > 3", () => {
    const { container } = render(<CapacityIndicator activePillarCount={4} />)
    expect(container.querySelector('[data-state="warn"]')).toBeInTheDocument()
    expect(screen.getByText(/over capacity/i)).toBeInTheDocument()
  })

  it("uses data-state='warn' when count = 5", () => {
    const { container } = render(<CapacityIndicator activePillarCount={5} />)
    expect(container.querySelector('[data-state="warn"]')).toBeInTheDocument()
  })

  it("accepts a custom total", () => {
    render(<CapacityIndicator activePillarCount={2} totalPillars={7} />)
    expect(screen.getByText(/7 pillars/i)).toBeInTheDocument()
  })
})
