import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/workout-logs - Log a completed workout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, timerPresetId, duration, notes } = body;

    const log = await prisma.workoutLog.create({
      data: {
        videoId: videoId || null,
        timerPresetId: timerPresetId || null,
        duration: duration || null,
        notes: notes || null,
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
