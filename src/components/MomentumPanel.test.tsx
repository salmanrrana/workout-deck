import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MomentumPanel } from "./MomentumPanel";

function jsonResponse(payload: unknown) {
  return { ok: true, json: async () => payload };
}

function logDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(9, 0, 0, 0);
  return { completedAt: date.toISOString(), duration: 900 };
}

function mockApis(logs: unknown[], weeklyGoal = 3) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/workout-logs")) return jsonResponse(logs);
      if (url.includes("/api/settings")) return jsonResponse({ weeklyGoal });
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

describe("MomentumPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("invites the first workout when there is no history", async () => {
    mockApis([]);
    render(<MomentumPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Every streak starts with one session/)).toBeTruthy();
    });
    expect(screen.getByRole("link", { name: /start a streak/i }).getAttribute("href")).toBe("/videos");
  });

  it("warns when an active streak has no session yet today", async () => {
    mockApis([logDaysAgo(1), logDaysAgo(2)]);
    render(<MomentumPanel />);

    await waitFor(() => {
      expect(screen.getByText(/2-day streak is on the line/)).toBeTruthy();
    });
    expect(screen.getByRole("link", { name: /make it 3 days/i })).toBeTruthy();
  });

  it("celebrates when today's session is already done", async () => {
    mockApis([logDaysAgo(0), logDaysAgo(1), logDaysAgo(2)]);
    render(<MomentumPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Today is done/)).toBeTruthy();
    });
    expect(screen.queryByRole("link", { name: /make it/i })).toBeNull();
  });

  it("shows weekly goal progress and the met state", async () => {
    mockApis([logDaysAgo(0), logDaysAgo(0), logDaysAgo(0)], 3);
    render(<MomentumPanel />);

    await waitFor(() => {
      expect(screen.getByText("Weekly goal hit 🎉")).toBeTruthy();
    });
  });

  it("renders nothing when history cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    const { container } = render(<MomentumPanel />);

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });
});
