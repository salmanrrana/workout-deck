import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TimerPage from "./page";

vi.mock("@/lib/audio", () => ({
  enableAudio: vi.fn().mockResolvedValue(true),
  playSound: vi.fn(),
}));

describe("Interval Timer", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders a complete glanceable instrument with editable configuration", () => {
    render(<TimerPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Interval Timer" })).toBeTruthy();
    expect(screen.getByRole("timer", { name: "READY 00:40" })).toBeTruthy();
    expect(screen.getByText("Round 1 of 6")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start timer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Skip interval" })).toBeTruthy();
    expect(screen.getByLabelText("Work seconds").getAttribute("value")).toBe("40");
    expect(screen.getByLabelText("Rest seconds").getAttribute("value")).toBe("20");
    expect(screen.getByLabelText("Rounds").getAttribute("value")).toBe("6");
  });

  it("applies a preset and runs through count-in, work, rest, pause, skip, and reset", async () => {
    vi.useFakeTimers();
    render(<TimerPage />);

    fireEvent.click(screen.getByRole("button", { name: "Tabata: 20 / 10 × 8" }));
    expect(screen.getByLabelText("Work seconds").getAttribute("value")).toBe("20");
    expect(screen.getByLabelText("Rest seconds").getAttribute("value")).toBe("10");
    expect(screen.getByLabelText("Rounds").getAttribute("value")).toBe("8");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("timer", { name: "GET READY 3" })).toBeTruthy();
    expect(screen.getByLabelText("Work seconds").hasAttribute("disabled")).toBe(true);

    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByRole("timer", { name: "GET READY GO" })).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByRole("timer", { name: "WORK 00:20" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("status").textContent).toContain("Paused");
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(screen.getByRole("timer", { name: "WORK 00:20" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip interval" }));
    expect(screen.getByRole("timer", { name: "REST 00:10" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Skip interval" }));
    expect(screen.getByRole("timer", { name: "WORK 00:20" })).toBeTruthy();
    expect(screen.getByText("Round 2 of 8")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("timer", { name: "READY 00:20" })).toBeTruthy();
    expect(screen.getByLabelText("Work seconds").hasAttribute("disabled")).toBe(false);
  });

  it("completes a configured sequence after the final work interval", async () => {
    vi.useFakeTimers();
    render(<TimerPage />);

    fireEvent.change(screen.getByLabelText("Work seconds"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Rest seconds"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Rounds"), { target: { value: "2" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
      await Promise.resolve();
    });
    await act(async () => vi.advanceTimersByTimeAsync(7000));

    expect(screen.getByRole("timer", { name: "COMPLETE 00:00" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Complete");
    expect(screen.getByRole("button", { name: "Start again" })).toBeTruthy();
  });
});
