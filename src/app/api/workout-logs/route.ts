import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/workout-logs - Log a completed workout
export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  try {
    const { videoId, timerPresetId, duration, notes } = body;

    if (!videoId && !timerPresetId) {
      return NextResponse.json(
        { error: "Either videoId or timerPresetId is required" },
        { status: 400 }
      );
    }

    if (
      duration !== undefined &&
      duration !== null &&
      (typeof duration !== "number" || duration < 0)
    ) {
      return NextResponse.json(
        { error: "Duration must be a non-negative number" },
        { status: 400 }
      );
    }

    const log = await prisma.workoutLog.create({
      data: {
        videoId: videoId ?? null,
        timerPresetId: timerPresetId ?? null,
        duration: duration ?? null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Failed to create workout log:", error);
    return NextResponse.json(
      { error: "Failed to create workout log" },
      { status: 500 }
    );
  }
}
