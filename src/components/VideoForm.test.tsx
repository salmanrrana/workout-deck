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

  it.each([
    ["YouTube", "abc123def45", "/api/youtube/info"],
    ["Vimeo", "123456789", "/api/vimeo/info"],
  ])("accepts a supported bare %s video ID through native form submission", async (provider, bareId, infoRoute) => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const requestUrl = String(input);
      if (requestUrl === "/api/videos" && !init) return Promise.resolve(jsonResponse([]));
      if (requestUrl.startsWith(infoRoute)) {
        return Promise.resolve(jsonResponse({
          id: bareId,
          title: `${provider} workout`,
          thumbnail: null,
        }));
      }
      if (requestUrl === "/api/videos" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ id: "video-new" }));
      }
      throw new Error(`Unexpected request: ${requestUrl}`);
    });

    render(<VideoForm mode="create" />);
    if (provider === "Vimeo") fireEvent.click(screen.getByRole("button", { name: "Vimeo" }));

    const sourceInput = screen.getByLabelText(new RegExp(`${provider} URL or video ID`)) as HTMLInputElement;
    expect(sourceInput.type).toBe("text");
    fireEvent.change(sourceInput, { target: { value: bareId } });
    await act(async () => vi.advanceTimersByTimeAsync(500));

    const submit = screen.getByRole("button", { name: "Add to deck" });
    expect(submit.hasAttribute("disabled")).toBe(false);
    fireEvent.click(submit);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(push).toHaveBeenCalledWith("/videos");
    const create = fetchMock.mock.calls.find(([url, init]) => String(url) === "/api/videos" && init?.method === "POST");
    expect(create).toBeTruthy();
    expect(JSON.parse(String(create?.[1]?.body))).toMatchObject({
      youtubeId: bareId,
      provider: provider.toLowerCase(),
    });
  });

  it("invalidates a ready preview as soon as its URL changes", async () => {
    vi.useFakeTimers();
    const pendingPreview = new Promise<Response>(() => {});
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const requestUrl = String(input);
      if (requestUrl === "/api/videos" && !init) return Promise.resolve(jsonResponse([]));
      if (requestUrl.includes("abc123def45")) {
        return Promise.resolve(jsonResponse({
          id: "abc123def45",
          title: "Original workout",
          thumbnail: null,
        }));
      }
      if (requestUrl.includes("zyx987wvu65")) return pendingPreview;
      throw new Error(`Unexpected request: ${requestUrl}`);
    });

    render(<VideoForm mode="create" />);
    const urlInput = screen.getByLabelText(/YouTube URL/);
    const submit = screen.getByRole("button", { name: "Add to deck" });

    fireEvent.change(urlInput, { target: { value: "https://youtube.com/watch?v=abc123def45" } });
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(submit.hasAttribute("disabled")).toBe(false);

    fireEvent.change(urlInput, { target: { value: "https://youtube.com/watch?v=zyx987wvu65" } });
    expect(submit.hasAttribute("disabled")).toBe(true);
    fireEvent.submit(submit.closest("form")!);

    expect(screen.getByRole("alert").textContent).toContain("Enter a valid YouTube link");
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("clears an auto-filled title when replacement metadata falls back", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const requestUrl = String(input);
      if (requestUrl === "/api/videos") return Promise.resolve(jsonResponse([]));
      if (requestUrl.includes("abc123def45")) {
        return Promise.resolve(jsonResponse({
          id: "abc123def45",
          title: "Original workout",
          thumbnail: null,
        }));
      }
      if (requestUrl.includes("zyx987wvu65")) {
        return Promise.resolve(jsonResponse({ error: "Unavailable" }, 404));
      }
      throw new Error(`Unexpected request: ${requestUrl}`);
    });

    render(<VideoForm mode="create" />);
    const urlInput = screen.getByLabelText(/YouTube URL/);
    const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
    const submit = screen.getByRole("button", { name: "Add to deck" });

    fireEvent.change(urlInput, { target: { value: "https://youtube.com/watch?v=abc123def45" } });
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(titleInput.value).toBe("Original workout");
    expect(submit.hasAttribute("disabled")).toBe(false);

    fireEvent.change(urlInput, { target: { value: "https://youtube.com/watch?v=zyx987wvu65" } });
    expect(titleInput.value).toBe("");
    await act(async () => vi.advanceTimersByTimeAsync(500));

    expect(titleInput.value).toBe("");
    expect(screen.getByText("Preview ready — add a title")).toBeTruthy();
    expect(submit.hasAttribute("disabled")).toBe(true);
  });

  it("keeps a saved custom title when edit preview metadata loads", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const requestUrl = String(input);
      if (requestUrl === "/api/videos") return Promise.resolve(jsonResponse([]));
      if (requestUrl === "/api/videos/video-1") {
        return Promise.resolve(jsonResponse({
          id: "video-1",
          youtubeId: "abc123def45",
          provider: "youtube",
          title: "My custom workout title",
          tags: [],
          notes: null,
        }));
      }
      if (requestUrl.startsWith("/api/youtube/info")) {
        return Promise.resolve(jsonResponse({
          id: "abc123def45",
          title: "Remote provider title",
          thumbnail: null,
        }));
      }
      throw new Error(`Unexpected request: ${requestUrl}`);
    });

    render(<VideoForm mode="edit" videoId="video-1" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => vi.advanceTimersByTimeAsync(500));

    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith("/api/youtube/info"))).toBe(true);
    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("My custom workout title");
  });

  it("warns that saved cues will be removed when an edit replaces the source", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const requestUrl = String(input);
      if (requestUrl === "/api/videos") return Promise.resolve(jsonResponse([]));
      if (requestUrl === "/api/videos/video-1") {
        return Promise.resolve(jsonResponse({
          id: "video-1",
          youtubeId: "abc123def45",
          provider: "youtube",
          title: "Original workout",
          tags: [],
          notes: null,
          cues: [{ id: "cue-1" }, { id: "cue-2" }],
        }));
      }
      if (requestUrl.startsWith("/api/youtube/info")) {
        const replacement = requestUrl.includes("zyx987wvu65");
        return Promise.resolve(jsonResponse({
          id: replacement ? "zyx987wvu65" : "abc123def45",
          title: replacement ? "Replacement workout" : "Original workout",
          thumbnail: null,
        }));
      }
      throw new Error(`Unexpected request: ${requestUrl}`);
    });

    render(<VideoForm mode="edit" videoId="video-1" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText(/YouTube URL or video ID/), {
      target: { value: "zyx987wvu65" },
    });
    await act(async () => vi.advanceTimersByTimeAsync(500));

    expect(screen.getByRole("status").textContent).toContain(
      "remove all 2 saved exercise cues",
    );
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
