import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import "dotenv/config";
import pg from "pg";

const args = process.argv.slice(2);
if (args[0] === "--") {
  args.shift();
}

const portFlagIndex = args.findIndex(
  (argument) => argument === "--port" || argument.startsWith("--port="),
);
const port =
  portFlagIndex === -1
    ? undefined
    : args[portFlagIndex] === "--port"
      ? args[portFlagIndex + 1]
      : args[portFlagIndex].slice("--port=".length);

if (!port || !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error("dev:verify requires a valid --port so its Next.js lock can be isolated.");
  process.exit(1);
}

const distDir = `.next-verify-${port}`;
const tsconfigDirectory = ".next-verify-config";
const tsconfigPath = `${tsconfigDirectory}/tsconfig-${port}.json`;
mkdirSync(tsconfigDirectory, { recursive: true });
writeFileSync(tsconfigPath, '{"extends":"../tsconfig.json"}\n');

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  console.error("dev:verify requires DATABASE_URL pointing at a local Postgres server.");
  process.exit(1);
}

// Each verification server gets its own throwaway database on the same
// Postgres server so parallel runs never share state.
const verifyDatabaseName = `workout_deck_verify_${port}`;
const adminUrl = new URL(baseUrl);
adminUrl.pathname = "/postgres";
const verifyUrl = new URL(baseUrl);
verifyUrl.pathname = `/${verifyDatabaseName}`;

const admin = new pg.Client({ connectionString: adminUrl.toString() });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${verifyDatabaseName} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${verifyDatabaseName}`);
await admin.end();

const database = new pg.Client({ connectionString: verifyUrl.toString() });
await database.connect();
const migrationDirectory = path.resolve("prisma", "migrations");
for (const migration of readdirSync(migrationDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  await database.query(
    readFileSync(path.join(migrationDirectory, migration, "migration.sql"), "utf8"),
  );
}
await database.end();

const nextCommand = process.platform === "win32" ? "next.cmd" : "next";
const child = spawn(nextCommand, ["dev", ...args], {
  env: {
    ...process.env,
    NODE_ENV: "development",
    NEXT_DIST_DIR: distDir,
    NEXT_TSCONFIG_PATH: tsconfigPath,
    DATABASE_URL: verifyUrl.toString(),
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(`Unable to start Next.js verification server: ${error.message}`);
  process.exit(1);
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
