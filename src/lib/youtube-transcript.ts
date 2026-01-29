// YouTube transcript fetching service
// Uses YouTube's innertube API to fetch auto-generated or manual captions

export interface TranscriptSegment {
  text: string;
  startSeconds: number;
  durationSeconds: number;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  language: string;
}

// Simple in-memory cache with TTL
const cache = new Map<string, { result: TranscriptResult; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch transcript for a YouTube video by its video ID.
 * Tries to get captions (auto-generated or manual) and parse with timestamps.
 * Returns null if no captions are available.
 */
export async function fetchTranscript(
  videoId: string
): Promise<TranscriptResult | null> {
  // Check cache
  const cached = cache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    // Step 1: Fetch the video page to get caption track info
    const videoPageRes = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    if (!videoPageRes.ok) {
      console.error(
        `Failed to fetch YouTube page for ${videoId}: ${videoPageRes.status}`
      );
      return null;
    }

    const html = await videoPageRes.text();

    // Step 2: Extract player response to find caption tracks
    const playerMatch = html.match(
      /var ytInitialPlayerResponse\s*=\s*(\{.+?\});/
    );
    if (!playerMatch) {
      // No player response found - video may be unavailable
      return null;
    }

    let playerResponse: {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{
            baseUrl: string;
            languageCode: string;
            kind?: string;
          }>;
        };
      };
    };
    try {
      playerResponse = JSON.parse(playerMatch[1]);
    } catch {
      console.error(`Failed to parse player response for ${videoId}`);
      return null;
    }

    const tracks =
      playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) {
      return null;
    }

    // Prefer English, then any manual caption, then auto-generated
    const englishTrack = tracks.find(
      (t) => t.languageCode === "en" && t.kind !== "asr"
    );
    const englishAutoTrack = tracks.find(
      (t) => t.languageCode === "en" && t.kind === "asr"
    );
    const manualTrack = tracks.find((t) => t.kind !== "asr");
    const selectedTrack =
      englishTrack ?? englishAutoTrack ?? manualTrack ?? tracks[0];

    // Step 3: Fetch the transcript XML
    const transcriptUrl = selectedTrack.baseUrl + "&fmt=json3";
    const transcriptRes = await fetch(transcriptUrl);

    if (!transcriptRes.ok) {
      console.error(
        `Failed to fetch transcript for ${videoId}: ${transcriptRes.status}`
      );
      return null;
    }

    const transcriptJson = await transcriptRes.json();
    const events = transcriptJson.events as
      | Array<{
          tStartMs?: number;
          dDurationMs?: number;
          segs?: Array<{ utf8: string }>;
        }>
      | undefined;

    if (!events) {
      return null;
    }

    // Step 4: Parse transcript segments
    const segments: TranscriptSegment[] = [];
    for (const event of events) {
      if (!event.segs || event.tStartMs === undefined) continue;

      const text = event.segs
        .map((s) => s.utf8)
        .join("")
        .replace(/\n/g, " ")
        .trim();
      if (!text) continue;

      segments.push({
        text,
        startSeconds: event.tStartMs / 1000,
        durationSeconds: (event.dDurationMs ?? 0) / 1000,
      });
    }

    if (segments.length === 0) {
      return null;
    }

    const result: TranscriptResult = {
      segments,
      language: selectedTrack.languageCode,
    };

    // Cache the result
    cache.set(videoId, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch (error) {
    console.error(`Error fetching transcript for ${videoId}:`, error);
    return null;
  }
}
