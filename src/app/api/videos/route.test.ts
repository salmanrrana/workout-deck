import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const { video } = vi.hoisted(() => ({
  video: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: { video } }));

const storedVimeoVideo = {
  id: "video-vimeo",
  youtubeId: "123456789",
  provider: "vimeo",
  title: "Vimeo strength session",
  tags: '["strength"]',
  notes: null,
  createdAt: new Date("2026-07-23T00:00:00.000Z"),
  updatedAt: new Date("2026-07-23T00:00:00.000Z"),
};

describe("videos API provider contract", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persists the selected provider when a video is created", async () => {
    video.findUnique.mockResolvedValue(null);
    video.create.mockResolvedValue(storedVimeoVideo);

    const response = await POST(
      new NextRequest("http://localhost/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeId: "123456789",
          provider: "vimeo",
          title: "Vimeo strength session",
          tags: ["strength"],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(video.create).toHaveBeenCalledWith({
      data: {
        youtubeId: "123456789",
        provider: "vimeo",
        title: "Vimeo strength session",
        tags: '["strength"]',
        notes: null,
      },
    });
    expect((await response.json()).provider).toBe("vimeo");
  });

  it("returns the persisted provider to the library", async () => {
    video.findMany.mockResolvedValue([storedVimeoVideo]);

    const response = await GET(
      new NextRequest("http://localhost/api/videos"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      expect.objectContaining({
        youtubeId: "123456789",
        provider: "vimeo",
        tags: ["strength"],
      }),
    ]);
  });

  it("rejects unknown providers instead of mislabelling them", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeId: "123456789",
          provider: "other",
          title: "Unknown provider",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(video.create).not.toHaveBeenCalled();
  });
});
