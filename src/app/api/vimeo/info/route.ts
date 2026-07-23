import { NextRequest, NextResponse } from "next/server";
import { extractVimeoId, fetchVimeoInfo } from "@/lib/vimeo";

// GET /api/vimeo/info?url=...
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const videoId = extractVimeoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "Invalid Vimeo URL" }, { status: 400 });
  }

  const info = await fetchVimeoInfo(videoId);
  if (!info) {
    return NextResponse.json({ error: "Could not fetch video info" }, { status: 404 });
  }

  return NextResponse.json(info);
}
