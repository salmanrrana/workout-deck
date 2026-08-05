import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/workout-logs - Return completed workouts with their source details
export async function GET() {
  try {
    const logs = await prisma.workoutLog.findMany({
      orderBy: { completedAt: "desc" },
      include: {
        video: {
          select: {
            id: true,
            youtubeId: true,
            provider: true,
            title: true,
          },
        },
        timerPreset: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch workout logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout logs" },
      { status: 500 }
    );
  }
}

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
