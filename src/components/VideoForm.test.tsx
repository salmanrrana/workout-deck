import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoForm } from "./VideoForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <span role="img" aria-label={alt} data-src={src} />
  ),
}));

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("VideoForm", () => {
  afterEach(() => {
    cleanup();
    push.mockReset();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("switches providers, shows a preview skeleton, and keeps tag editing behavior", async () => {
    vi.useFakeTimers();
    let resolvePreview!: (response: Response) => void;
    const preview = new Promise<Response>((resolve) => {
      resolvePreview = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/videos") return Promise.resolve(jsonResponse([{ tags: ["mobility"] }]));
      if (url.startsWith("/api/vimeo/info")) return preview;
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<VideoForm mode="create" />);
    expect(screen.getByRole("button", { name: "Add to deck" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Vimeo" }));
    fireEvent.change(screen.getByLabelText(/Vimeo URL/), {
      target: { value: "https://vimeo.com/123456789" },
    });
    await act(async () => vi.advanceTimersByTimeAsync(500));

    expect(screen.getByRole("status", { name: "Fetching Vimeo preview" })).toBeTruthy();
    await act(async () => resolvePreview(jsonResponse({
      id: "123456789",
      title: "Mobility reset",
      thumbnail: "https://i.vimeocdn.com/video/123_640.jpg",
    })));

    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("Mobility reset");
    expect(screen.getByRole("button", { name: "Add to deck" }).hasAttribute("disabled")).toBe(false);

    const tagInput = screen.getByLabelText("Tags");
    fireEvent.change(tagInput, { target: { value: "recovery" } });
    fireEvent.keyDown(tagInput, { key: "," });
    expect(screen.getByLabelText("Selected tags").textContent).toContain("recovery");
    fireEvent.click(screen.getByRole("button", { name: "Remove recovery tag" }));
    expect(screen.queryByRole("button", { name: "Remove recovery tag" })).toBeNull();
  });

  it("loads an existing card and saves changes through the edit route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url === "/api/videos" && !init) {
        return Promise.resolve(jsonResponse([{ tags: ["strength", "mobility"] }]));
      }
      if (url === "/api/videos/video-1" && !init) {
        return Promise.resolve(jsonResponse({
          id: "video-1",
          youtubeId: "abc123def45",
          provider: "youtube",
          title: "Morning strength",
          tags: ["strength"],
          notes: "Bring a mat",
        }));
      }
      if (url.startsWith("/api/youtube/info")) {
        return Promise.resolve(jsonResponse({
          id: "abc123def45",
          title: "Morning strength",
          thumbnail: "https://img.youtube.com/vi/abc123def45/mqdefault.jpg",
        }));
      }
      if (url === "/api/videos/video-1" && init?.method === "PUT") {
        return Promise.resolve(jsonResponse({ id: "video-1" }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<VideoForm mode="edit" videoId="video-1" />);

    await waitFor(() => {
      expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("Morning strength");
    });
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Morning power" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/videos/video-1"));
    const update = fetchMock.mock.calls.find(([url, init]) => String(url) === "/api/videos/video-1" && init?.method === "PUT");
    expect(update).toBeTruthy();
    expect(JSON.parse(String(update?.[1]?.body))).toMatchObject({
      provider: "youtube",
      title: "Morning power",
      tags: ["strength"],
    });
  });
});
