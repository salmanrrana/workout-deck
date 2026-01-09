/**
 * YouTube utilities for URL parsing and video info fetching.
 */

/**
 * Extract YouTube video ID from various URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - Just the video ID itself
 */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim();

  // Already a video ID (11 characters, alphanumeric with - and _)
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Try to parse as URL
  try {
    const url = new URL(trimmed);

    // youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      if (videoId && /^[\w-]{11}$/.test(videoId)) {
        return videoId;
      }

      // youtube.com/embed/VIDEO_ID or youtube.com/v/VIDEO_ID
      const pathMatch = url.pathname.match(/\/(embed|v)\/([^/?]+)/);
      if (pathMatch && /^[\w-]{11}$/.test(pathMatch[2])) {
        return pathMatch[2];
      }
    }

    // youtu.be/VIDEO_ID
    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.slice(1).split("/")[0];
      if (videoId && /^[\w-]{11}$/.test(videoId)) {
        return videoId;
      }
    }
  } catch {
    // Not a valid URL, try regex patterns
  }

  // Fallback: try to find an 11-character video ID in the string
  const match = trimmed.match(/[\w-]{11}/);
  return match ? match[0] : null;
}

/**
 * Get YouTube thumbnail URL for a video ID.
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: "default" | "mq" | "hq" | "sd" | "maxres" = "mq"
): string {
  const qualityMap = {
    default: "default",
    mq: "mqdefault",
    hq: "hqdefault",
    sd: "sddefault",
    maxres: "maxresdefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Get YouTube video URL from video ID.
 */
export function getYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
}

/**
 * Fetch video info from YouTube using oEmbed API (no API key required).
 */
export async function fetchYouTubeInfo(
  videoId: string
): Promise<YouTubeVideoInfo | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      id: videoId,
      title: data.title,
      thumbnail: getYouTubeThumbnail(videoId, "mq"),
    };
  } catch {
    return null;
  }
}
