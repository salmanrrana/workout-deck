import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const WEEKLY_GOAL_KEY = "weeklyGoal";
export const DEFAULT_WEEKLY_GOAL = 3;
const MAX_WEEKLY_GOAL = 14;

// GET /api/settings - Return user preferences with defaults applied
export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: WEEKLY_GOAL_KEY },
    });
    const parsed = setting ? Number.parseInt(setting.value, 10) : NaN;
    const weeklyGoal = Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_WEEKLY_GOAL
      ? parsed
      : DEFAULT_WEEKLY_GOAL;

    return NextResponse.json({ weeklyGoal });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT /api/settings - Update user preferences
export async function PUT(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { weeklyGoal } = body;
  if (!Number.isInteger(weeklyGoal) || weeklyGoal < 1 || weeklyGoal > MAX_WEEKLY_GOAL) {
    return NextResponse.json(
      { error: `weeklyGoal must be an integer between 1 and ${MAX_WEEKLY_GOAL}` },
      { status: 400 },
    );
  }

  try {
    await prisma.setting.upsert({
      where: { key: WEEKLY_GOAL_KEY },
      update: { value: String(weeklyGoal) },
      create: { key: WEEKLY_GOAL_KEY, value: String(weeklyGoal) },
    });

    return NextResponse.json({ weeklyGoal });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
