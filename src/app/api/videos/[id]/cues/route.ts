import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/videos/[id]/cues - List cues for a video
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const cues = await prisma.exerciseCue.findMany({
      where: { videoId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(cues);
  } catch (error) {
    console.error("Failed to fetch cues:", error);
    return NextResponse.json(
      { error: "Failed to fetch cues" },
      { status: 500 }
    );
  }
}

// POST /api/videos/[id]/cues - Create a new cue
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { timestamp, exerciseName } = body;

    if (typeof timestamp !== "number" || timestamp < 0) {
      return NextResponse.json(
        { error: "timestamp must be a non-negative number" },
        { status: 400 }
      );
    }
    if (typeof exerciseName !== "string" || !exerciseName.trim()) {
      return NextResponse.json(
        { error: "exerciseName is required" },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Get the next order value
    const lastCue = await prisma.exerciseCue.findFirst({
      where: { videoId: id },
      orderBy: { order: "desc" },
    });
    const nextOrder = (lastCue?.order ?? 0) + 1;

    const cue = await prisma.exerciseCue.create({
      data: {
        videoId: id,
        timestamp: Math.floor(timestamp),
        exerciseName: exerciseName.trim(),
        order: nextOrder,
      },
    });

    return NextResponse.json(cue, { status: 201 });
  } catch (error) {
    console.error("Failed to create cue:", error);
    return NextResponse.json(
      { error: "Failed to create cue" },
      { status: 500 }
    );
  }
}

// PUT /api/videos/[id]/cues - Bulk update cues (for reordering and editing)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { cues } = body;

    if (!Array.isArray(cues)) {
      return NextResponse.json(
        { error: "cues must be an array" },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Validate each cue
    for (const cue of cues) {
      if (typeof cue.id !== "string") {
        return NextResponse.json(
          { error: "Each cue must have an id" },
          { status: 400 }
        );
      }
      if (typeof cue.timestamp !== "number" || cue.timestamp < 0) {
        return NextResponse.json(
          { error: "Each cue must have a non-negative timestamp" },
          { status: 400 }
        );
      }
      if (typeof cue.exerciseName !== "string" || !cue.exerciseName.trim()) {
        return NextResponse.json(
          { error: "Each cue must have an exerciseName" },
          { status: 400 }
        );
      }
      if (typeof cue.order !== "number") {
        return NextResponse.json(
          { error: "Each cue must have an order" },
          { status: 400 }
        );
      }
    }

    // Verify all cue IDs belong to this video
    const existingCues = await prisma.exerciseCue.findMany({
      where: { videoId: id },
      select: { id: true },
    });
    const validIds = new Set(existingCues.map((c) => c.id));
    for (const cue of cues) {
      if (!validIds.has(cue.id)) {
        return NextResponse.json(
          { error: "One or more cues do not belong to this video" },
          { status: 403 }
        );
      }
    }

    // Update all cues in a transaction
    const updated = await prisma.$transaction(
      cues.map((cue: { id: string; timestamp: number; exerciseName: string; order: number }) =>
        prisma.exerciseCue.update({
          where: { id: cue.id },
          data: {
            timestamp: Math.floor(cue.timestamp),
            exerciseName: cue.exerciseName.trim(),
            order: cue.order,
          },
        })
      )
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update cues:", error);
    return NextResponse.json(
      { error: "Failed to update cues" },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id]/cues - Delete a cue by cueId query param
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const cueId = searchParams.get("cueId");

    if (!cueId) {
      return NextResponse.json(
        { error: "cueId query parameter is required" },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Verify the cue belongs to this video
    const cue = await prisma.exerciseCue.findUnique({
      where: { id: cueId },
    });
    if (!cue || cue.videoId !== id) {
      return NextResponse.json({ error: "Cue not found" }, { status: 404 });
    }

    await prisma.exerciseCue.delete({ where: { id: cueId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete cue:", error);
    return NextResponse.json(
      { error: "Failed to delete cue" },
      { status: 500 }
    );
  }
}
