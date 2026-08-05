import { describe, expect, it } from "vitest";
import { buildMomentum } from "./momentum";

const NOW = new Date("2026-08-04T18:00:00"); // a Tuesday

function log(daysAgo: number, duration = 600) {
  const date = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, 9, 30);
  return { completedAt: date.toISOString(), duration };
}

describe("buildMomentum", () => {
  it("returns an empty snapshot with no logs", () => {
    expect(buildMomentum([], NOW)).toEqual({
      streak: 0,
      workedOutToday: false,
      longestStreak: 0,
      thisWeek: 0,
      totalWorkouts: 0,
      totalDuration: 0,
    });
  });

  it("counts a streak ending today as safe", () => {
    const snapshot = buildMomentum([log(0), log(1), log(2)], NOW);
    expect(snapshot.streak).toBe(3);
    expect(snapshot.workedOutToday).toBe(true);
  });

  it("keeps yesterday's streak alive but flags today as pending", () => {
    const snapshot = buildMomentum([log(1), log(2)], NOW);
    expect(snapshot.streak).toBe(2);
    expect(snapshot.workedOutToday).toBe(false);
  });

  it("breaks the streak after a missed day", () => {
    const snapshot = buildMomentum([log(2), log(3)], NOW);
    expect(snapshot.streak).toBe(0);
    expect(snapshot.longestStreak).toBe(2);
  });

  it("finds the longest historical streak even when the current one is shorter", () => {
    const snapshot = buildMomentum([log(0), log(5), log(6), log(7), log(8)], NOW);
    expect(snapshot.streak).toBe(1);
    expect(snapshot.longestStreak).toBe(4);
  });

  it("counts multiple sessions on one day as a single streak day", () => {
    const snapshot = buildMomentum([log(0), log(0), log(1)], NOW);
    expect(snapshot.streak).toBe(2);
    expect(snapshot.totalWorkouts).toBe(3);
  });

  it("counts this week's sessions from Monday", () => {
    // NOW is Tuesday: today and yesterday (Monday) are in-week, Sunday is not.
    const snapshot = buildMomentum([log(0), log(1), log(2)], NOW);
    expect(snapshot.thisWeek).toBe(2);
  });

  it("sums logged duration and tolerates null durations", () => {
    const snapshot = buildMomentum([log(0, 600), { completedAt: log(1).completedAt, duration: null }], NOW);
    expect(snapshot.totalDuration).toBe(600);
  });
});
