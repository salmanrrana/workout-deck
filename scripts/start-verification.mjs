import { spawn } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

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
const databasePath = path.resolve(tsconfigDirectory, `database-${port}.db`);
mkdirSync(tsconfigDirectory, { recursive: true });
writeFileSync(tsconfigPath, '{"extends":"../tsconfig.json"}\n');

for (const suffix of ["", "-journal", "-shm", "-wal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}

const database = new Database(databasePath);
const migrationDirectory = path.resolve("prisma", "migrations");
for (const migration of readdirSync(migrationDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  database.exec(
    readFileSync(path.join(migrationDirectory, migration, "migration.sql"), "utf8"),
  );
}
database.close();

const nextCommand = process.platform === "win32" ? "next.cmd" : "next";
const child = spawn(nextCommand, ["dev", ...args], {
  env: {
    ...process.env,
    NODE_ENV: "development",
    NEXT_DIST_DIR: distDir,
    NEXT_TSCONFIG_PATH: tsconfigPath,
    WORKOUT_DECK_DB_PATH: databasePath,
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
