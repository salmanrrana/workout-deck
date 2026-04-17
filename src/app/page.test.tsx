import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the History quick link", () => {
    render(<Home />);
    const history = screen.getByRole("link", { name: /history/i });
    expect(history.getAttribute("href")).toBe("/history");
  });

  it("styles the History quick link with yellow background classes, not zinc", () => {
    render(<Home />);
    const historyLinks = screen.getAllByRole("link", { name: /history/i });
    expect(historyLinks.length).toBeGreaterThan(0);
    for (const history of historyLinks) {
      expect(history.getAttribute("href")).toBe("/history");
      const className = history.getAttribute("class") ?? "";
      expect(className).toMatch(/bg-yellow-/);
      expect(className).not.toMatch(/bg-zinc-/);
      expect(className).toMatch(/hover:bg-yellow-/);
    }
  });
});
