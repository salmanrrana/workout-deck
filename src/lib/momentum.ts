// Momentum math shared by the home dashboard and history views. All day
// boundaries use the viewer's local timezone so a late-night session still
// counts for the day it was performed.

export type MomentumSnapshot = {
  /** Consecutive training days ending today or yesterday. */
  streak: number;
  /** Whether the active streak already includes a session today. */
  workedOutToday: boolean;
  /** Longest run of consecutive training days on record. */
  longestStreak: number;
  /** Sessions completed since the start of the current ISO week (Monday). */
  thisWeek: number;
  totalWorkouts: number;
  /** Total logged duration in seconds. */
  totalDuration: number;
};

type LogLike = { completedAt: string; duration?: number | null };

export function buildMomentum(logs: LogLike[], now = new Date()): MomentumSnapshot {
  const today = startOfDay(now);
  const dayKeys = new Set<string>();
  let totalDuration = 0;

  for (const log of logs) {
    dayKeys.add(dateKey(new Date(log.completedAt)));
    totalDuration += log.duration ?? 0;
  }

  const workedOutToday = dayKeys.has(dateKey(today));
  let streakCursor = workedOutToday ? today : addDays(today, -1);
  let streak = 0;
  while (dayKeys.has(dateKey(streakCursor))) {
    streak += 1;
    streakCursor = addDays(streakCursor, -1);
  }

  const longestStreak = computeLongestStreak(dayKeys);
  const weekStart = startOfWeek(today);
  const thisWeek = logs.filter((log) => new Date(log.completedAt) >= weekStart).length;

  return {
    streak,
    workedOutToday,
    longestStreak,
    thisWeek,
    totalWorkouts: logs.length,
    totalDuration,
  };
}

function computeLongestStreak(dayKeys: Set<string>): number {
  let longest = 0;
  for (const key of dayKeys) {
    const day = parseKey(key);
    // Only start counting from the first day of each run.
    if (dayKeys.has(dateKey(addDays(day, -1)))) continue;

    let length = 0;
    let cursor = day;
    while (dayKeys.has(dateKey(cursor))) {
      length += 1;
      cursor = addDays(cursor, 1);
    }
    longest = Math.max(longest, length);
  }
  return longest;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfWeek(date: Date): Date {
  const day = date.getDay();
  return addDays(startOfDay(date), -(day === 0 ? 6 : day - 1));
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
