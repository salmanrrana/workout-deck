import { NextRequest, NextResponse } from "next/server";
import {
  GATE_COOKIE,
  GATE_COOKIE_MAX_AGE,
  passwordMatches,
  sessionToken,
} from "@/lib/gate";

// POST /api/unlock - Exchange the shared password for a session cookie
export async function POST(request: NextRequest) {
  const configured = process.env.SITE_PASSWORD;
  if (!configured) {
    return NextResponse.json({ error: "The gate is not enabled" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { password } = body;
  if (typeof password !== "string" || !(await passwordMatches(password, configured))) {
    return NextResponse.json({ error: "That password isn't right" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: GATE_COOKIE,
    value: await sessionToken(configured),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GATE_COOKIE_MAX_AGE,
  });
  return response;
}
