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

function deferredVideosResponse() {
  let resolvePromise!: (response: Response) => void;
  const promise = new Promise<Response>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve(videos: typeof video[]) {
      resolvePromise(new Response(JSON.stringify(videos), { status: 200 }));
    },
  };
}

describe("VideosPage", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows a deck-shaped loading state until videos arrive", async () => {
    const request = deferredVideosResponse();
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => request.promise);

    render(<VideosPage />);

    expect(screen.getByRole("status", { name: "Loading your deck" })).toBeTruthy();
    await act(async () => request.resolve([]));
    expect(screen.queryByRole("status", { name: "Loading your deck" })).toBeNull();
    expect(screen.getByText("Your deck is empty")).toBeTruthy();
  });

  it("uses links for Add Video navigation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(<VideosPage />);

    await waitFor(() => expect(screen.getByText("Your deck is empty")).toBeTruthy());
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

  it("keeps the newest search and tag results when responses finish out of order", async () => {
    vi.useFakeTimers();
    const initial = deferredVideosResponse();
    const staleSearch = deferredVideosResponse();
    const currentFilters = deferredVideosResponse();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => initial.promise)
      .mockImplementationOnce(() => staleSearch.promise)
      .mockImplementationOnce(() => currentFilters.promise);

    render(<VideosPage />);
    await act(async () => initial.resolve([video]));

    fireEvent.change(screen.getByRole("searchbox", { name: "Search videos" }), {
      target: { value: "morning" },
    });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search videos" }), {
      target: { value: "evening" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mobility" }));

    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(
      "tag=Mobility&search=evening",
    );

    const eveningVideo = { ...video, id: "video-2", title: "Evening mobility" };
    await act(async () => currentFilters.resolve([eveningVideo]));
    expect(screen.getByText("Evening mobility")).toBeTruthy();

    await act(async () => staleSearch.resolve([video]));
    expect(screen.getByText("Evening mobility")).toBeTruthy();
    expect(screen.queryByText("Morning mobility")).toBeNull();
  });

  it("does not let an in-flight filtered response overwrite cleared results", async () => {
    vi.useFakeTimers();
    const initial = deferredVideosResponse();
    const staleFilters = deferredVideosResponse();
    const clearedFilters = deferredVideosResponse();
    vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => initial.promise)
      .mockImplementationOnce(() => staleFilters.promise)
      .mockImplementationOnce(() => clearedFilters.promise);

    render(<VideosPage />);
    await act(async () => initial.resolve([video]));

    fireEvent.change(screen.getByRole("searchbox", { name: "Search videos" }), {
      target: { value: "morning" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mobility" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));

    await act(async () => clearedFilters.resolve([]));
    expect(screen.getByText("Your deck is empty")).toBeTruthy();

    await act(async () => staleFilters.resolve([video]));
    expect(screen.getByText("Your deck is empty")).toBeTruthy();
    expect(screen.queryByText("Morning mobility")).toBeNull();
  });
});
