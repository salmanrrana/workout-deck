import { describe, expect, it } from "vitest";
import { passwordMatches, sessionToken } from "./gate";

describe("gate", () => {
  it("derives a stable token for the same password", async () => {
    expect(await sessionToken("hunter2")).toBe(await sessionToken("hunter2"));
  });

  it("derives different tokens for different passwords", async () => {
    expect(await sessionToken("hunter2")).not.toBe(await sessionToken("hunter3"));
  });

  it("accepts the correct password", async () => {
    expect(await passwordMatches("open sesame", "open sesame")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(await passwordMatches("open sesame", "different")).toBe(false);
    expect(await passwordMatches("", "different")).toBe(false);
  });
});
