import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Logo } from "@/components/logo";

describe("Logo", () => {
  it("framed variant renders the cream background rect", () => {
    const { container } = render(<Logo variant="framed" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toBeInTheDocument();
    // Cream rect is the background; should be present in framed mode
    const rects = svg.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThan(0);
  });

  it("unframed variant strips the cream background rect", () => {
    const { container } = render(<Logo variant="unframed" />);
    const svg = container.querySelector("svg")!;
    // Unframed should NOT contain any <rect> — only <path>
    const rects = svg.querySelectorAll("rect");
    expect(rects.length).toBe(0);
  });

  it("accepts className and size props", () => {
    const { container } = render(
      <Logo variant="framed" className="custom-class" size={48} />
    );
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveClass("custom-class");
    expect(svg.getAttribute("width")).toBe("48");
    expect(svg.getAttribute("height")).toBe("38");
  });

  it("unframed variant's ink paths use currentColor", () => {
    const { container } = render(<Logo variant="unframed" />);
    const svg = container.querySelector("svg")!;
    const inkPaths = Array.from(svg.querySelectorAll("path")).filter(
      (p) => p.getAttribute("fill") === "currentColor"
    );
    // Body silhouette + 4 fin/jaw/bar paths = 5 ink paths in the unframed variant
    expect(inkPaths.length).toBe(5);
    inkPaths.forEach((p) => {
      expect(p.getAttribute("fill")).toBe("currentColor");
    });
  });
});
