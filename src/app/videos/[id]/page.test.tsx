import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VideoPlayerPage from "./page";

const player = vi.hoisted(() => ({
  registerPlayer: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  seekTo: vi.fn(),
  currentTime: 65,
  duration: 600,
  state: "paused" as const,
  isReady: true,
  handlers: {
    onReady: vi.fn(),
    onStateChange: vi.fn(),
    onTimeUpdate: vi.fn(),
  },
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, use: () => ({ id: "video-1" }) };
});

vi.mock("@/components/YouTubePlayer", () => ({
  useYouTubePlayer: () => player,
  YouTubePlayer: ({ onTimeUpdate }: { onTimeUpdate: (time: number) => void }) => (
    <button onClick={() => onTimeUpdate(65)}>YouTube workout player</button>
  ),
}));

vi.mock("@/components/VimeoPlayer", () => ({
  VimeoPlayer: () => <div>Vimeo workout player</div>,
}));

vi.mock("@/components/CueEditor", () => ({
  CueEditor: () => <div>Cue editing controls</div>,
}));

vi.mock("@/components/AutoExtractButton", () => ({
  AutoExtractButton: () => <button>Extract cues from transcript</button>,
}));

const video = {
  id: "video-1",
  youtubeId: "abc123",
  provider: "youtube",
  title: "Morning strength",
  tags: ["Strength"],
  notes: "A full-body session.",
  cues: [
    { id: "cue-1", videoId: "video-1", timestamp: 0, exerciseName: "Warm up", order: 1 },
    { id: "cue-2", videoId: "video-1", timestamp: 60, exerciseName: "Squats", order: 2 },
  ],
};

function renderPage() {
  return render(<VideoPlayerPage params={Promise.resolve({ id: "video-1" })} />);
}

describe("Workout session cockpit", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("prioritizes elapsed time, semantic state, transport, logging, and the active cue", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(video), { status: 200 }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByRole("heading", { name: "Morning strength" })).toBeTruthy());
    expect(screen.getByRole("status").textContent).toContain("Paused");
    expect(screen.getByText("1:05")).toBeTruthy();
    expect(screen.getByText("of 10:00")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Restart video" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log workout" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "YouTube workout player" }));
    expect((await screen.findAllByText("Squats")).length).toBeGreaterThan(0);
    expect(screen.getByText("Current exercise")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(player.play).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Restart video" }));
    expect(player.seekTo).toHaveBeenCalledWith(0);
  });

  it("keeps cue maintenance secondary and logs the workout in place", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(video), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "log-1" }), { status: 201 }));

    renderPage();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Morning strength" })).toBeTruthy());

    const details = screen.getByText("Workout cues").closest("details");
    expect(details?.hasAttribute("open")).toBe(false);
    fireEvent.click(screen.getByText("Workout cues"));
    expect(details?.hasAttribute("open")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Log workout" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Workout logged" })).toBeTruthy());
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/workout-logs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ videoId: "video-1", duration: 65 }),
      }),
    );
  });

  it("renders the persisted Vimeo provider instead of forcing YouTube", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ...video, provider: "vimeo" }), { status: 200 }),
    );

    renderPage();

    expect(await screen.findByText("Vimeo workout player")).toBeTruthy();
    expect(screen.queryByText("YouTube workout player")).toBeNull();
  });
});
