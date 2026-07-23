import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoCard } from "./VideoCard";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("next/image", () => ({
  default: function MockImage({ alt }: { alt: string }) {
    return <span role="img" aria-label={alt} />;
  },
}));

const youtubeVideo = {
  id: "video-1",
  youtubeId: "abc123def45",
  title: "Morning mobility",
  tags: ["mobility", "recovery"],
  notes: null,
  createdAt: "2026-07-22T00:00:00.000Z",
  provider: "youtube" as const,
};

describe("VideoCard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    push.mockReset();
  });

  it("identifies both supported video providers", () => {
    const { rerender } = render(<VideoCard video={youtubeVideo} />);
    expect(screen.getByText("YouTube")).toBeTruthy();

    rerender(
      <VideoCard
        video={{
          ...youtubeVideo,
          id: "video-2",
          youtubeId: "vimeo:123456",
          provider: "vimeo",
        }}
      />,
    );
    expect(screen.getByText("Vimeo")).toBeTruthy();
  });

  it("offers clear play and edit actions", () => {
    render(<VideoCard video={youtubeVideo} />);

    expect(screen.getByRole("link", { name: "Play" }).getAttribute("href")).toBe(
      "/videos/video-1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Morning mobility" }));
    expect(push).toHaveBeenCalledWith("/videos/video-1/edit");
  });

  it("confirms deletion, exposes progress, and removes the card on success", async () => {
    let finishDelete!: (response: Response) => void;
    const pendingDelete = new Promise<Response>((resolve) => {
      finishDelete = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => pendingDelete);
    const onDelete = vi.fn();

    render(<VideoCard video={youtubeVideo} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Morning mobility" }));

    expect(screen.getByRole("group", { name: "Delete Morning mobility?" })).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirm delete Morning mobility" });
    fireEvent.click(confirm);
    expect(confirm.getAttribute("aria-busy")).toBe("true");
    expect(confirm.hasAttribute("disabled")).toBe(true);

    await act(async () => finishDelete(new Response(null, { status: 204 })));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("video-1"));
  });

  it("keeps the confirmation open and explains how to recover when deletion fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );

    render(<VideoCard video={youtubeVideo} onDelete={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Morning mobility" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete Morning mobility" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Couldn’t delete this video. Try again.",
    );
    expect(screen.getByRole("button", { name: "Cancel delete" })).toBeTruthy();
  });
});
