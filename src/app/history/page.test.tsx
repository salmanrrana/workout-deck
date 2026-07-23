import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HistoryPage from "./page";

vi.mock("next/image", () => ({
  default: function MockImage({ alt }: { alt: string }) {
    return <span role="img" aria-label={alt} />;
  },
}));

const NOW = new Date(2026, 6, 23, 12, 0, 0);

function completedAt(daysAgo: number, hour: number) {
  return new Date(2026, 6, 23 - daysAgo, hour, 30, 0).toISOString();
}

describe("Workout history", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("turns completed workouts into glanceable stats, consistency, and linked daily activity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "log-today",
          completedAt: completedAt(0, 9),
          duration: 1800,
          video: { id: "video-1", title: "Full Body Strength", youtubeId: "abc123", provider: "youtube" },
          timerPreset: null,
        },
        {
          id: "log-yesterday",
          completedAt: completedAt(1, 18),
          duration: 900,
          video: { id: "video-2", title: "Mobility Flow", youtubeId: "def456", provider: "youtube" },
          timerPreset: null,
        },
      ],
    }));

    render(<HistoryPage />);

    expect(screen.getByRole("status", { name: "Loading workout history" })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Activity" })).toBeTruthy());

    expect(screen.getByText("Current streak").parentElement?.textContent).toContain("2days");
    expect(screen.getByText("Time trained").parentElement?.textContent).toContain("45:00total");
    expect(screen.getByRole("heading", { name: "Today" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Full Body Strength/i }).getAttribute("href")).toBe("/videos/video-1");
    expect(screen.getByRole("link", { name: /Mobility Flow/i }).getAttribute("href")).toBe("/videos/video-2");
    expect(screen.getByLabelText(/Jul 23, 2026: 1 workout$/)).toBeTruthy();
  });

  it("offers a direct path to the video deck when no workouts exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<HistoryPage />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "No workouts logged yet" })).toBeTruthy());
    expect(screen.getByRole("link", { name: "Choose a workout" }).getAttribute("href")).toBe("/videos");
  });
});
