import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

describe("Home dashboard", () => {
  it("makes starting a workout the primary path while preserving every destination", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "WorkoutDeck" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Start a workout/i })
        .getAttribute("href"),
    ).toBe("/videos");
    expect(
      screen
        .getByRole("link", { name: /Workout videos/i })
        .getAttribute("href"),
    ).toBe("/videos");
    expect(
      screen
        .getByRole("link", { name: /Interval timer/i })
        .getAttribute("href"),
    ).toBe("/timer");
    expect(
      screen
        .getByRole("link", { name: /Workout history/i })
        .getAttribute("href"),
    ).toBe("/history");
  });
});
