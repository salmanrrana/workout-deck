export interface TranscriptSegment {
  text: string;
  startSeconds: number;
  durationSeconds: number;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  language: string;
}

// In-memory cache with TTL and size limit
const cache = new Map<string, { result: TranscriptResult | null; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for "no captions" results
const MAX_CACHE_SIZE = 100;

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Fetch transcript for a YouTube video by its video ID.
 * Tries to get captions (auto-generated or manual) and parse with timestamps.
 * Returns null if no captions are available.
 */
export async function fetchTranscript(
  videoId: string
): Promise<TranscriptResult | null> {
  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
    console.error(`Invalid YouTube video ID: "${videoId}"`);
    return null;
  }

  // Check cache (includes negative results)
  const cached = cache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }
  // Evict expired entry
  if (cached) {
    cache.delete(videoId);
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
    // Use [\s\S] instead of . to match newlines (TypeScript target may not support /s flag)
    const playerMatch = html.match(
      /var ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});/
    );
    if (!playerMatch) {
      console.warn(
        `No ytInitialPlayerResponse found for ${videoId}. Video may be unavailable.`
      );
      cacheResult(videoId, null);
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
      console.error(
        `Failed to parse player response for ${videoId}. Captured length: ${playerMatch[1].length}`
      );
      return null;
    }

    const tracks =
      playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) {
      console.info(`Video ${videoId} has no caption tracks.`);
      cacheResult(videoId, null);
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

    // Step 3: Fetch the transcript in JSON3 format
    const transcriptUrl = selectedTrack.baseUrl + "&fmt=json3";
    const transcriptRes = await fetch(transcriptUrl);

    if (!transcriptRes.ok) {
      console.error(
        `Failed to fetch transcript for ${videoId}: ${transcriptRes.status}`
      );
      return null;
    }

    const transcriptJson = await transcriptRes.json();
    const events = transcriptJson?.events;

    if (!Array.isArray(events)) {
      console.error(
        `Transcript JSON for ${videoId} has no events array.`
      );
      return null;
    }

    // Step 4: Parse transcript segments
    const segments: TranscriptSegment[] = [];
    for (const event of events) {
      if (!event.segs || event.tStartMs === undefined) continue;

      const text = event.segs
        .map((s: { utf8: string }) => s.utf8)
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
      console.warn(
        `All events for ${videoId} produced zero segments.`
      );
      cacheResult(videoId, null);
      return null;
    }

    const result: TranscriptResult = {
      segments,
      language: selectedTrack.languageCode,
    };

    cacheResult(videoId, result);
    return result;
  } catch (error) {
    console.error(`Error fetching transcript for ${videoId}:`, error);
    return null;
  }
}

function cacheResult(videoId: string, result: TranscriptResult | null): void {
  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  cache.set(videoId, {
    result,
    expiresAt: Date.now() + (result ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
  });
}
