import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTags, stringifyTags } from "@/lib/types";

// GET /api/videos - List all videos with optional tag filter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tagFilter = searchParams.get("tag");
    const search = searchParams.get("search");

    let videos = await prisma.video.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Filter by tag if provided
    if (tagFilter) {
      videos = videos.filter((video) => {
        const tags = parseTags(video.tags);
        return tags.includes(tagFilter);
      });
    }

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      videos = videos.filter((video) =>
        video.title.toLowerCase().includes(searchLower)
      );
    }

    // Transform videos to include parsed tags
    const transformedVideos = videos.map((video) => ({
      ...video,
      tags: parseTags(video.tags),
    }));

    return NextResponse.json(transformedVideos);
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

// POST /api/videos - Create new video
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeId, title, tags, notes } = body;

    // Validate required fields
    if (!youtubeId || !title) {
      return NextResponse.json(
        { error: "youtubeId and title are required" },
        { status: 400 }
      );
    }

    // Check if video with this youtubeId already exists
    const existing = await prisma.video.findUnique({
      where: { youtubeId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A video with this YouTube ID already exists" },
        { status: 409 }
      );
    }

    const video = await prisma.video.create({
      data: {
        youtubeId,
        title,
        tags: stringifyTags(tags || []),
        notes: notes || null,
      },
    });

    return NextResponse.json(
      {
        ...video,
        tags: parseTags(video.tags),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create video:", error);
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    );
  }
}
