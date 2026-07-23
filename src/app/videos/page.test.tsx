import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VideosPage from "./page";

vi.mock("@/components/VideoCard", () => ({
  VideoCard: ({ video }: { video: { title: string } }) => <article>{video.title}</article>,
}));

const video = {
  id: "video-1",
  youtubeId: "abc123",
  title: "Morning mobility",
  tags: ["Mobility"],
  notes: null,
  createdAt: "2026-07-22T00:00:00.000Z",
};

describe("VideosPage", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses links for Add Video navigation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<VideosPage />);

    await waitFor(() => expect(screen.getByText("Your video library is empty")).toBeTruthy());
    for (const link of screen.getAllByRole("link", { name: /add video/i })) {
      expect(link.getAttribute("href")).toBe("/videos/new");
    }
  });

  it("clears combined tag and search filters without requesting the stale search", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([video]), { status: 200 }),
    );
    render(<VideosPage />);

    await act(async () => Promise.resolve());
    fireEvent.change(screen.getByRole("searchbox", { name: "Search videos" }), {
      target: { value: "morning" },
    });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    fireEvent.click(screen.getByRole("button", { name: "Mobility" }));
    await act(async () => Promise.resolve());

    const requestsBeforeClear = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    await act(async () => Promise.resolve());

    const requestsAfterClear = fetchMock.mock.calls
      .slice(requestsBeforeClear)
      .map(([url]) => String(url));
    expect(requestsAfterClear).toContain("/api/videos?");
    expect(requestsAfterClear.some((url) => url.includes("search=morning"))).toBe(false);
  });
});
