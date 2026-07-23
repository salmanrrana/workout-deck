/*
 * THESIS: Progress should read like accumulated training rhythm, not a database table.
 * OWN-WORLD: Graphite instrument panels, signal-green activity marks, and large tabular totals.
 * STORY: See momentum first, scan consistency, then revisit the sessions that built it.
 * FIRST VIEWPORT: A compact reward header leads into four glance stats and a 12-week rhythm strip.
 * FORM: A prescribed athletic activity view shaped directly from the ticket's established world.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { buttonClassName } from "@/components/ui/Button";
import { formatTime } from "@/lib/types";

type WorkoutSource = {
  id: string;
  title: string;
  youtubeId: string;
  provider: string;
};

type WorkoutLog = {
  id: string;
  completedAt: string;
  duration: number | null;
  video: WorkoutSource | null;
  timerPreset: { id: string; name: string } | null;
};

type DayGroup = {
  key: string;
  label: string;
  logs: WorkoutLog[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const heatLevels = ["bg-surface-2", "bg-accent/20", "bg-accent/45", "bg-accent/70", "bg-accent"];

export default function HistoryPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/workout-logs", { signal: controller.signal });
        if (!response.ok) throw new Error("Request failed");
        setLogs(await response.json());
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setError("We couldn’t load your workout history. Check your connection and try again.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadHistory();
    return () => controller.abort();
  }, [requestVersion]);

  const history = useMemo(() => buildHistory(logs), [logs]);

  return (
    <div className="py-8 sm:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-label">Training record</p>
          <h1 className="mt-2 text-h1 font-bold tracking-tight sm:text-display-xl">Workout History</h1>
          <p className="mt-3 max-w-[65ch] text-body text-muted">
            Every finished session adds another card to your rhythm.
          </p>
        </div>
        {!isLoading && logs.length > 0 && (
          <Link href="/videos" className={buttonClassName({ variant: "secondary" })}>
            Start another workout
            <ArrowIcon className="h-4 w-4" />
          </Link>
        )}
      </header>

      {isLoading && <HistorySkeleton />}

      {!isLoading && error && (
        <EmptyState
          className="mt-8"
          icon={<RefreshIcon className="h-6 w-6" />}
          title="Your history is out of reach"
          description={error}
          action={<Button onClick={() => setRequestVersion((version) => version + 1)}>Try again</Button>}
        />
      )}

      {!isLoading && !error && logs.length === 0 && (
        <EmptyState
          className="mt-8 sm:mt-10"
          icon={<HistoryIcon className="h-6 w-6" />}
          title="No workouts logged yet"
          description="Finish a workout to start your streak and see your training rhythm take shape."
          action={(
            <Link href="/videos" data-history-empty-action className={buttonClassName()}>
              Choose a workout
            </Link>
          )}
        />
      )}

      {!isLoading && !error && logs.length > 0 && (
        <div className="mt-8 space-y-10 sm:mt-10 sm:space-y-12">
          <section aria-label="Workout summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            <Stat label="Current streak" value={`${history.streak}`} suffix={history.streak === 1 ? "day" : "days"} icon={<FlameIcon />} />
            <Stat label="This week" value={`${history.thisWeek}`} suffix={history.thisWeek === 1 ? "workout" : "workouts"} />
            <Stat label="All time" value={`${logs.length}`} suffix={logs.length === 1 ? "workout" : "workouts"} />
            <Stat label="Time trained" value={formatTime(history.totalDuration)} suffix="total" />
          </section>

          <Card as="section" padding="none" className="overflow-hidden" aria-labelledby="consistency-heading">
            <div className="border-b border-border px-5 py-5 sm:flex sm:items-end sm:justify-between sm:px-6">
              <div>
                <p className="text-label">Last 12 weeks</p>
                <h2 id="consistency-heading" className="mt-2 text-h2 font-bold tracking-tight">Consistency</h2>
              </div>
              <p className="mt-2 text-small text-muted sm:mt-0">Darker marks mean more sessions.</p>
            </div>
            <div className="px-5 py-6 sm:px-6">
              <div className="grid grid-flow-col grid-rows-7 gap-1.5" aria-label="Workout activity by day">
                {history.heatmap.map((day) => {
                  const level = day.count === 0 ? 0 : Math.min(4, day.count);
                  return (
                    <span
                      key={day.key}
                      title={`${day.label}: ${day.count} workout${day.count === 1 ? "" : "s"}`}
                      aria-label={`${day.label}: ${day.count} workout${day.count === 1 ? "" : "s"}`}
                      className={`aspect-square min-w-0 rounded-sm ${day.isFuture ? "bg-surface-1" : heatLevels[level]} motion-safe:transition-colors motion-safe:[transition-duration:var(--dur)]`}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{history.heatmap[0]?.shortLabel}</span>
                <span>Today</span>
              </div>
            </div>
          </Card>

          <section aria-labelledby="activity-heading">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-label">Completed sessions</p>
                <h2 id="activity-heading" className="mt-2 text-h2 font-bold tracking-tight">Activity</h2>
              </div>
              <p className="text-small text-muted">Newest first</p>
            </div>

            <div className="space-y-8">
              {history.groups.map((group) => (
                <section key={group.key} aria-labelledby={`day-${group.key}`}>
                  <h3 id={`day-${group.key}`} className="mb-3 text-small font-semibold text-muted">{group.label}</h3>
                  <Card as="ul" padding="none" className="divide-y divide-border overflow-hidden">
                    {group.logs.map((log) => <ActivityRow key={log.id} log={log} />)}
                  </Card>
                </section>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, suffix, icon }: { label: string; value: string; suffix: string; icon?: ReactNode }) {
  return (
    <Card padding="none" className="min-w-0 px-4 py-5 sm:px-5 sm:py-6">
      <p className="flex items-center gap-2 text-label">
        {icon && <span className="text-accent" aria-hidden="true">{icon}</span>}
        {label}
      </p>
      <p className="mt-4 truncate font-mono text-[clamp(1.75rem,5vw,2.5rem)] font-bold leading-none tracking-[-0.03em] tabular-nums text-text">{value}</p>
      <p className="mt-2 text-small text-muted">{suffix}</p>
    </Card>
  );
}

function ActivityRow({ log }: { log: WorkoutLog }) {
  const content = (
    <>
      <WorkoutThumbnail source={log.video} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text group-hover:text-accent group-focus-visible:text-accent">
          {log.video?.title ?? log.timerPreset?.name ?? "Workout session"}
        </span>
        <span className="mt-1 block text-small text-muted">
          {log.video ? `${providerLabel(log.video.provider)} workout` : "Interval timer"}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-body font-semibold tabular-nums text-text">{formatTime(log.duration ?? 0)}</span>
        <time dateTime={log.completedAt} className="mt-1 block text-small text-muted">{formatClockTime(log.completedAt)}</time>
      </span>
      {log.video && <ArrowIcon className="hidden h-4 w-4 shrink-0 text-faint sm:block" />}
    </>
  );

  return (
    <li>
      {log.video ? (
        <Link href={`/videos/${log.video.id}`} className="group flex min-h-20 items-center gap-3 px-4 py-3 motion-safe:transition-colors motion-safe:[transition-duration:var(--dur)] hover:bg-surface-2 sm:gap-4 sm:px-5">
          {content}
        </Link>
      ) : (
        <div className="flex min-h-20 items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">{content}</div>
      )}
    </li>
  );
}

function WorkoutThumbnail({ source }: { source: WorkoutSource | null }) {
  const isYouTube = source?.provider === "youtube";
  return (
    <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-surface-2 sm:h-14 sm:w-20">
      {source && isYouTube ? (
        <Image src={`https://img.youtube.com/vi/${source.youtubeId}/mqdefault.jpg`} alt={`${source.title} thumbnail`} fill sizes="80px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-faint"><PlayIcon className="h-5 w-5" /></span>
      )}
    </span>
  );
}

function HistorySkeleton() {
  return (
    <div role="status" aria-label="Loading workout history" className="mt-8 space-y-10" aria-busy="true">
      <span className="sr-only">Loading workout history</span>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-lg" />)}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  );
}

function buildHistory(logs: WorkoutLog[]) {
  const now = startOfDay(new Date());
  const countByDay = new Map<string, number>();
  let totalDuration = 0;

  for (const log of logs) {
    const key = dateKey(new Date(log.completedAt));
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    totalDuration += log.duration ?? 0;
  }

  const weekStart = startOfWeek(now);
  const thisWeek = logs.filter((log) => new Date(log.completedAt) >= weekStart).length;
  let streakCursor = countByDay.has(dateKey(now)) ? now : addDays(now, -1);
  let streak = 0;
  while (countByDay.has(dateKey(streakCursor))) {
    streak += 1;
    streakCursor = addDays(streakCursor, -1);
  }

  const heatmapStart = addDays(weekStart, -77);
  const heatmap = Array.from({ length: 84 }, (_, index) => {
    const date = addDays(heatmapStart, index);
    return {
      key: dateKey(date),
      count: countByDay.get(dateKey(date)) ?? 0,
      isFuture: date > now,
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      shortLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };
  });

  const groupsByDay = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    const key = dateKey(new Date(log.completedAt));
    groupsByDay.set(key, [...(groupsByDay.get(key) ?? []), log]);
  }
  const groups: DayGroup[] = Array.from(groupsByDay, ([key, dayLogs]) => ({
    key,
    label: dayLabel(new Date(dayLogs[0].completedAt), now),
    logs: dayLogs,
  }));

  return { groups, heatmap, streak, thisWeek, totalDuration };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(startOfDay(date), -(day === 0 ? 6 : day - 1));
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayLabel(date: Date, today: Date) {
  const difference = Math.round((startOfDay(today).getTime() - startOfDay(date).getTime()) / DAY_MS);
  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatClockTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function providerLabel(provider: string) {
  return provider === "vimeo" ? "Vimeo" : "YouTube";
}

function ArrowIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}
function FlameIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.5c.5 3-1.2 4.3-2.7 5.8-1.4 1.4-2.6 2.7-2.3 5.2.2 1.6 1.1 3 2.5 3.8-.1-1.9.8-3.1 2.2-4.5.2 2.2 2 2.9 2 5.2 2-1.1 3.3-3.3 3.3-5.8 0-4.2-2.7-7.6-5-9.7Z" /></svg>;
}
function PlayIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M7 5.5a1 1 0 0 1 1.53-.85l10 6.5a1 1 0 0 1 0 1.7l-10 6.5A1 1 0 0 1 7 18.5v-13Z" /></svg>;
}
function HistoryIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4.9 7.5A8 8 0 1 1 4 14" /><path d="M4 4v4h4M12 8v5l3 2" /></svg>;
}
function RefreshIcon({ className }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 11a8 8 0 1 0-2.3 6.7" /><path d="M20 5v6h-6" /></svg>;
}
