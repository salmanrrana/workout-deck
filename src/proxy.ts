import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, sessionToken } from "@/lib/gate";

// Paths that must stay reachable while locked so the unlock flow works.
const PUBLIC_PATHS = new Set(["/unlock", "/api/unlock"]);

export default async function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  // No password configured means the gate is off (local tooling, verification
  // servers). Production always sets SITE_PASSWORD via Netlify env vars.
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken(password))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unlockUrl = new URL("/unlock", request.nextUrl);
  if (pathname !== "/") unlockUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  // Skip Next.js internals and static assets; everything else is gated.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|woff2?)$).*)",
  ],
};
