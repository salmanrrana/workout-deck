"use client";

/*
 * THESIS: The first thing you see should tell you exactly one thing — did you move today?
 * OWN-WORLD: A graphite instrument strip with a single flame accent and goal segments.
 * STORY: Read your streak, see today's status, and get one sentence pushing the next session.
 * FORM: A slim momentum band between the hero and the deck; never a wall of stats.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, IconButton, Skeleton } from "@/components/ui";
import { buildMomentum, type MomentumSnapshot } from "@/lib/momentum";

type WorkoutLog = { completedAt: string; duration: number | null };

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; momentum: MomentumSnapshot };

const GOAL_LIMITS = { min: 1, max: 14 };

export function MomentumPanel() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [weeklyGoal, setWeeklyGoal] = useState(3);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [logsResponse, settingsResponse] = await Promise.all([
          fetch("/api/workout-logs", { signal: controller.signal }),
          fetch("/api/settings", { signal: controller.signal }),
        ]);
        if (!logsResponse.ok) throw new Error("Request failed");
        const logs: WorkoutLog[] = await logsResponse.json();
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          if (Number.isInteger(settings.weeklyGoal)) setWeeklyGoal(settings.weeklyGoal);
        }
        setState({ status: "ready", momentum: buildMomentum(logs) });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setState({ status: "error" });
        }
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const adjustGoal = async (delta: number) => {
    const next = Math.min(GOAL_LIMITS.max, Math.max(GOAL_LIMITS.min, weeklyGoal + delta));
    if (next === weeklyGoal) return;
    setWeeklyGoal(next);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyGoal: next }),
      });
    } catch {
      // The optimistic value stays for this visit; the server keeps its last good value.
    }
  };

  const message = useMemo(
    () => (state.status === "ready" ? momentumMessage(state.momentum, weeklyGoal) : null),
    [state, weeklyGoal],
  );

  if (state.status === "error") return null;

  if (state.status === "loading") {
    return (
      <section aria-label="Your momentum" className="mx-auto mt-12 max-w-4xl">
        <Skeleton className="h-36 rounded-lg" />
      </section>
    );
  }

  const { momentum } = state;
  const goalMet = momentum.thisWeek >= weeklyGoal;

  return (
    <Card
      as="section"
      aria-label="Your momentum"
      bordered
      padding="none"
      className="mx-auto mt-12 max-w-4xl overflow-hidden"
    >
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-center gap-5">
          <span
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${
              momentum.workedOutToday ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"
            }`}
            aria-hidden="true"
          >
            <FlameIcon className="h-8 w-8" />
          </span>
          <div>
            <p className="font-mono text-[2.5rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-text">
              {momentum.streak}
              <span className="ml-2 text-body font-semibold tracking-normal text-muted">
                day{momentum.streak === 1 ? "" : "s"} streak
              </span>
            </p>
            <p className="mt-2 max-w-[46ch] text-body text-muted">{message}</p>
            {momentum.longestStreak > 1 && (
              <p className="mt-1 text-small text-faint">
                Personal best: {momentum.longestStreak} days
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 sm:text-right">
          <div className="flex items-center gap-2 sm:justify-end">
            <p className="text-label" id="weekly-goal-label">This week</p>
            <div className="flex items-center gap-1">
              <IconButton
                aria-label="Lower weekly goal"
                size="sm"
                onClick={() => adjustGoal(-1)}
                disabled={weeklyGoal <= GOAL_LIMITS.min}
              >
                <MinusIcon className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                aria-label="Raise weekly goal"
                size="sm"
                onClick={() => adjustGoal(1)}
                disabled={weeklyGoal >= GOAL_LIMITS.max}
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>
          <p
            className={`mt-2 font-mono text-h2 font-bold tabular-nums ${goalMet ? "text-accent" : "text-text"}`}
            aria-labelledby="weekly-goal-label"
          >
            {momentum.thisWeek}
            <span className="text-muted"> / {weeklyGoal}</span>
          </p>
          <div
            className="mt-3 flex gap-1.5 sm:justify-end"
            role="img"
            aria-label={`${momentum.thisWeek} of ${weeklyGoal} workouts this week`}
          >
            {Array.from({ length: weeklyGoal }, (_, index) => (
              <span
                key={index}
                className={`h-2 w-6 rounded-full ${
                  index < momentum.thisWeek ? "bg-accent" : "bg-surface-3"
                } motion-safe:transition-colors motion-safe:[transition-duration:var(--dur)]`}
                aria-hidden="true"
              />
            ))}
          </div>
          {goalMet && <p className="mt-2 text-small font-semibold text-accent">Weekly goal hit 🎉</p>}
        </div>
      </div>

      {!momentum.workedOutToday && (
        <div className="border-t border-border bg-surface-2/50 px-6 py-3 sm:px-7">
          <Link
            href="/videos"
            className="group inline-flex items-center gap-2 text-small font-semibold text-accent"
          >
            {momentum.streak > 0
              ? `Train today to make it ${momentum.streak + 1} days`
              : "Log a workout today to start a streak"}
            <ArrowIcon className="h-4 w-4 motion-safe:transition-transform motion-safe:[transition-duration:var(--dur)] motion-safe:group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </Card>
  );
}

function momentumMessage(momentum: MomentumSnapshot, weeklyGoal: number): string {
  if (momentum.totalWorkouts === 0) {
    return "Every streak starts with one session. Pick a workout and press play — that's the whole job today.";
  }
  if (momentum.workedOutToday) {
    return momentum.streak >= 3
      ? "Today is done. You're building something real — protect it tomorrow."
      : "Today is done. Show up again tomorrow and the streak keeps growing.";
  }
  if (momentum.streak >= momentum.longestStreak && momentum.streak >= 3) {
    return "You're at your personal best. One session today sets a new record.";
  }
  if (momentum.streak > 0) {
    return `Your ${momentum.streak}-day streak is on the line. One session today keeps it alive.`;
  }
  if (momentum.thisWeek >= weeklyGoal) {
    return "Goal already hit this week — a bonus session today starts a fresh streak.";
  }
  return "No streak right now, and that's fine. The next one starts the moment you press play.";
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.5c.5 3-1.2 4.3-2.7 5.8-1.4 1.4-2.6 2.7-2.3 5.2.2 1.6 1.1 3 2.5 3.8-.1-1.9.8-3.1 2.2-4.5.2 2.2 2 2.9 2 5.2 2-1.1 3.3-3.3 3.3-5.8 0-4.2-2.7-7.6-5-9.7Z" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
