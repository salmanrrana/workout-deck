import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the History quick link", () => {
    render(<Home />);
    const history = screen.getByRole("link", { name: /history/i });
    expect(history.getAttribute("href")).toBe("/history");
  });
});
