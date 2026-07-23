import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CueEditor } from "./CueEditor";

const cues = [
  {
    id: "cue-1",
    videoId: "video-1",
    timestamp: 60,
    exerciseName: "Squats",
    order: 1,
  },
];

describe("CueEditor accessibility", () => {
  afterEach(cleanup);

  it("keeps create and edit fields associated with accessible labels", () => {
    render(
      <CueEditor
        videoId="video-1"
        cues={cues}
        currentTime={65}
        onCuesChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit cues manually" }));
    expect(screen.getByRole("textbox", { name: "Exercise name" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Cue timestamp" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit cue" }));
    expect(screen.getByRole("textbox", { name: "Timestamp for Squats" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Exercise name for cue 1" })).toBeTruthy();
  });
});
