// Shared-password gate primitives, used by the proxy and the unlock route.
//
// The session cookie stores an HMAC derived from SITE_PASSWORD, so rotating
// the password (netlify env:set SITE_PASSWORD ... + redeploy) invalidates
// every existing session at once. Web Crypto keeps this portable across the
// proxy and route-handler runtimes.

export const GATE_COOKIE = "wd_unlock";
export const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

const TOKEN_CONTEXT = "workout-deck-unlock-v1";

export async function sessionToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(TOKEN_CONTEXT));
  return toHex(new Uint8Array(signature));
}

/**
 * Compare a submitted password against the configured one without leaking
 * timing: both sides are reduced to fixed-length HMACs before comparison.
 */
export async function passwordMatches(submitted: string, configured: string): Promise<boolean> {
  // Web Crypto rejects zero-length HMAC keys, and an empty value should never
  // unlock anything anyway.
  if (submitted.length === 0 || configured.length === 0) return false;
  const [submittedToken, configuredToken] = await Promise.all([
    sessionToken(submitted),
    sessionToken(configured),
  ]);
  if (submittedToken.length !== configuredToken.length) return false;
  let difference = 0;
  for (let index = 0; index < submittedToken.length; index += 1) {
    difference |= submittedToken.charCodeAt(index) ^ configuredToken.charCodeAt(index);
  }
  return difference === 0;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
