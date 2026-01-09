import { NextRequest, NextResponse } from "next/server";
import { extractYouTubeId, fetchYouTubeInfo } from "@/lib/youtube";

// GET /api/youtube/info?url=...
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return NextResponse.json(
      { error: "Invalid YouTube URL" },
      { status: 400 }
    );
  }

  const info = await fetchYouTubeInfo(videoId);

  if (!info) {
    return NextResponse.json(
      { error: "Could not fetch video info" },
      { status: 404 }
    );
  }

  return NextResponse.json(info);
}
