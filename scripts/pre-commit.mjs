#!/usr/bin/env node
/* global console, process */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function stagedPaths() {
  const result = spawnSync("git", ["diff", "--cached", "--name-only", "-z"], {
    encoding: "buffer",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout.toString().split("\0").filter(Boolean);
}

let exitCode = run("pnpm", ["exec", "lint-staged"]);
const paths = exitCode === 0 ? stagedPaths() : [];
const needsProjectCheck = paths.some(
  (path) =>
    /\.(?:js|jsx|mjs|cjs|ts|tsx)$/.test(path) ||
    /(^|\/)(?:package\.json|pnpm-lock\.yaml|tsconfig\.json|vitest\.config\.ts|eslint\.config\.mjs|prisma\.config\.ts|schema\.prisma)$/.test(
      path,
    ),
);

if (exitCode === 0 && needsProjectCheck) {
  const snapshot = mkdtempSync(join(tmpdir(), "workout-deck-staged-"));
  try {
    exitCode = run("git", ["checkout-index", "--all", `--prefix=${snapshot}/`]);
    if (exitCode === 0) {
      symlinkSync(
        resolve("node_modules"),
        join(snapshot, "node_modules"),
        "dir",
      );
      exitCode = run("pnpm", ["generate"], snapshot);
      if (exitCode === 0) exitCode = run("pnpm", ["check:fast"], snapshot);
    }
  } finally {
    rmSync(snapshot, { recursive: true, force: true });
  }
} else if (exitCode === 0) {
  console.log("pre-commit: no staged code or toolchain changes");
}

process.exitCode = exitCode;
