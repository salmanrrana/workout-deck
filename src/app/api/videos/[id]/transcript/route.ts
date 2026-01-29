import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchTranscript } from "@/lib/youtube-transcript";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/videos/[id]/transcript - Fetch transcript for a video
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const video = await prisma.video.findUnique({
      where: { id },
      select: { youtubeId: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const transcript = await fetchTranscript(video.youtubeId);

    if (!transcript) {
      return NextResponse.json(
        {
          error: "No transcript available",
          message:
            "This video does not have captions or transcripts available.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(transcript);
  } catch (error) {
    console.error("Failed to fetch transcript:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcript" },
      { status: 500 }
    );
  }
}
