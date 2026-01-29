import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { fetchTranscript } from "@/lib/youtube-transcript";
import { formatTime } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ExtractedCue {
  timestamp: number;
  exerciseName: string;
}

const SYSTEM_PROMPT = `You are an exercise identification assistant. Given a YouTube video transcript with timestamps, identify distinct exercise movements or activities mentioned.

For each exercise, extract:
1. The timestamp (in seconds) when the exercise begins or is first mentioned
2. The exercise name (concise, e.g. "Push-ups", "Squats", "Plank", "Mountain Climbers")

Rules:
- Only include actual exercises/movements, not rest periods, introductions, or transitions
- Use standard exercise names when possible
- If the instructor says "we're going to do squats" at 0:45 and starts at 1:00, use the start time (60 seconds)
- Consolidate repeated mentions of the same exercise into a single entry at the first occurrence
- Return exercises in chronological order by timestamp

Respond with ONLY a JSON array of objects, no other text:
[{"timestamp": 30, "exerciseName": "Jumping Jacks"}, {"timestamp": 90, "exerciseName": "Push-ups"}]

If no exercises are found in the transcript, respond with an empty array: []`;

// POST /api/videos/[id]/extract-cues - Extract exercise cues from transcript using Claude
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    // Fetch video
    const video = await prisma.video.findUnique({
      where: { id },
      select: { id: true, youtubeId: true, title: true },
    });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Optionally accept save=true and/or pre-extracted cues
    let body: { save?: boolean; cues?: ExtractedCue[] } = {};
    try {
      body = await request.json();
    } catch {
      // No body is fine - defaults to not saving
    }

    // If cues are provided (from a previous preview), save them directly
    if (body.save && Array.isArray(body.cues)) {
      const validCues = validateAndCleanCues(body.cues, id);
      const savedCues = await saveCues(video.id, validCues);
      return NextResponse.json({ cues: savedCues, saved: true });
    }

    // Fetch transcript
    const transcript = await fetchTranscript(video.youtubeId);
    if (!transcript) {
      return NextResponse.json(
        {
          error: "No transcript available",
          message:
            "Cannot extract exercises: this video has no captions or transcript.",
        },
        { status: 404 }
      );
    }

    // Format transcript for Claude
    const transcriptText = transcript.segments
      .map((s) => `[${formatTime(s.startSeconds)}] ${s.text}`)
      .join("\n");

    // Call Claude API
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Video title: "${video.title}"\n\nTranscript:\n${transcriptText}`,
        },
      ],
    });

    // Parse response
    const firstBlock = message.content[0];
    if (!firstBlock || firstBlock.type !== "text") {
      console.error(
        `Unexpected Claude response format for video ${id}:`,
        message.content
      );
      return NextResponse.json(
        { error: "Unexpected AI response format" },
        { status: 502 }
      );
    }
    const responseText = firstBlock.text;

    let extractedCues: ExtractedCue[];
    try {
      extractedCues = JSON.parse(responseText);
    } catch {
      console.error(
        `Failed to parse Claude response for video ${id}:`,
        responseText
      );
      return NextResponse.json(
        { error: "Failed to parse exercise extraction results" },
        { status: 502 }
      );
    }

    if (!Array.isArray(extractedCues)) {
      return NextResponse.json(
        { error: "Invalid extraction results format" },
        { status: 502 }
      );
    }

    const validCues = validateAndCleanCues(extractedCues, id);

    // If save=true (without pre-provided cues), persist extraction results
    if (body.save) {
      const savedCues = await saveCues(video.id, validCues);
      return NextResponse.json({
        cues: savedCues,
        saved: true,
        transcript: {
          language: transcript.language,
          segmentCount: transcript.segments.length,
        },
      });
    }

    return NextResponse.json({
      cues: validCues,
      saved: false,
      transcript: {
        language: transcript.language,
        segmentCount: transcript.segments.length,
      },
    });
  } catch (error) {
    console.error("Failed to extract cues:", error);

    // Check for Anthropic-specific errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key. Please check your ANTHROPIC_API_KEY." },
          { status: 503 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "AI service error. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract cues" },
      { status: 500 }
    );
  }
}

function validateAndCleanCues(
  cues: ExtractedCue[],
  videoId: string
): { timestamp: number; exerciseName: string; order: number }[] {
  const validCues = cues
    .filter(
      (cue) =>
        typeof cue.timestamp === "number" &&
        cue.timestamp >= 0 &&
        typeof cue.exerciseName === "string" &&
        cue.exerciseName.trim().length > 0
    )
    .map((cue, index) => ({
      timestamp: Math.floor(cue.timestamp),
      exerciseName: cue.exerciseName.trim(),
      order: index + 1,
    }));

  const filteredCount = cues.length - validCues.length;
  if (filteredCount > 0) {
    console.warn(
      `Filtered out ${filteredCount} invalid cue(s) for video ${videoId}`
    );
  }

  return validCues;
}

async function saveCues(
  videoId: string,
  cues: { timestamp: number; exerciseName: string; order: number }[]
) {
  const savedCues = await prisma.$transaction(async (tx) => {
    await tx.exerciseCue.deleteMany({
      where: { videoId },
    });
    const created = [];
    for (const cue of cues) {
      const saved = await tx.exerciseCue.create({
        data: {
          videoId,
          timestamp: cue.timestamp,
          exerciseName: cue.exerciseName,
          order: cue.order,
        },
      });
      created.push(saved);
    }
    return created;
  });
  return savedCues;
}
