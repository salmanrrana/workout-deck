import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

const { video } = vi.hoisted(() => ({
  video: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: { video } }));

const existingVideo = {
  id: "video-1",
  youtubeId: "abc123def45",
  provider: "youtube",
  title: "Original workout",
  tags: "[]",
  notes: null,
  createdAt: new Date("2026-07-23T00:00:00.000Z"),
  updatedAt: new Date("2026-07-23T00:00:00.000Z"),
};

describe("single video API source updates", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("removes stale exercise cues when the video source changes", async () => {
    video.findUnique
      .mockResolvedValueOnce(existingVideo)
      .mockResolvedValueOnce(null);
    video.update.mockResolvedValue({
      ...existingVideo,
      youtubeId: "zyx987wvu65",
      title: "Replacement workout",
    });

    const response = await PUT(
      new NextRequest("http://localhost/api/videos/video-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeId: "zyx987wvu65",
          provider: "youtube",
          title: "Replacement workout",
          tags: [],
          notes: null,
        }),
      }),
      { params: Promise.resolve({ id: "video-1" }) },
    );

    expect(response.status).toBe(200);
    expect(video.update).toHaveBeenCalledWith({
      where: { id: "video-1" },
      data: expect.objectContaining({
        youtubeId: "zyx987wvu65",
        cues: { deleteMany: {} },
      }),
    });
  });
});
