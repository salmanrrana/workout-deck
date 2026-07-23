import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTags, stringifyTags } from "@/lib/types";

const VIDEO_PROVIDERS = ["youtube", "vimeo"] as const;
type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

function isVideoProvider(value: unknown): value is VideoProvider {
  return VIDEO_PROVIDERS.includes(value as VideoProvider);
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/videos/[id] - Get single video
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        cues: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...video,
      tags: parseTags(video.tags),
    });
  } catch (error) {
    console.error("Failed to fetch video:", error);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 500 }
    );
  }
}

// PUT /api/videos/[id] - Update video
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { youtubeId, title, tags, notes, provider } = body;

    if (provider !== undefined && !isVideoProvider(provider)) {
      return NextResponse.json(
        { error: "provider must be either youtube or vimeo" },
        { status: 400 }
      );
    }

    // Check if video exists
    const existing = await prisma.video.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // If youtubeId is being changed, check for duplicates
    if (youtubeId && youtubeId !== existing.youtubeId) {
      const duplicate = await prisma.video.findUnique({
        where: { youtubeId },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A video with this provider ID already exists" },
          { status: 409 }
        );
      }
    }

    const video = await prisma.video.update({
      where: { id },
      data: {
        ...(youtubeId && { youtubeId }),
        ...(provider !== undefined && { provider }),
        ...(title && { title }),
        ...(tags !== undefined && { tags: stringifyTags(tags) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json({
      ...video,
      tags: parseTags(video.tags),
    });
  } catch (error) {
    console.error("Failed to update video:", error);
    return NextResponse.json(
      { error: "Failed to update video" },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id] - Delete video
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if video exists
    const existing = await prisma.video.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    await prisma.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete video:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
