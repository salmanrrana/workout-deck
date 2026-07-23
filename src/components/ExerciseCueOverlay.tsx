"use client";

import { useState } from "react";
import { Card, IconButton } from "@/components/ui";
import type { ExerciseCue } from "@/lib/types";
import { formatTime } from "@/lib/types";

interface ExerciseCueOverlayProps {
  activeCue: ExerciseCue | null;
  cues: ExerciseCue[];
  currentTime: number;
  onSeek: (seconds: number) => void;
}

export function ExerciseCueOverlay({
  activeCue,
  cues,
  currentTime,
  onSeek,
}: ExerciseCueOverlayProps) {
  const [visible, setVisible] = useState(true);

  if (!cues.length) return null;

  const activeIndex = activeCue ? cues.findIndex((cue) => cue.id === activeCue.id) : -1;
  const upcomingCues = cues
    .slice(activeIndex + 1)
    .filter((cue) => cue.timestamp > currentTime)
    .slice(0, 2);

  if (!visible) {
    return (
      <Card className="flex min-h-14 items-center justify-between gap-4 px-4 py-2">
        <p className="text-small text-muted">Exercise cue hidden</p>
        <IconButton
          onClick={() => setVisible(true)}
          variant="ghost"
          aria-label="Show exercise overlay"
        >
          <EyeOffIcon className="h-5 w-5" />
        </IconButton>
      </Card>
    );
  }

  return (
    <Card
      as="section"
      aria-label="Current exercise cue"
      padding="none"
      className="relative overflow-hidden bg-surface-1"
    >
      <div className="absolute right-3 top-3 z-10">
        <IconButton
          onClick={() => setVisible(false)}
          variant="ghost"
          aria-label="Hide exercise overlay"
        >
          <EyeIcon className="h-5 w-5" />
        </IconButton>
      </div>

      <div
        key={activeCue?.id ?? "waiting"}
        className="min-h-32 px-5 py-6 pr-16 sm:flex sm:items-center sm:gap-5 sm:px-6"
        aria-live="polite"
      >
        {activeCue ? (
          <>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-h2 font-bold tabular-nums text-accent-fg [box-shadow:0_10px_30px_-14px_var(--accent)]">
              {activeCue.order}
            </div>
            <div className="mt-4 min-w-0 sm:mt-0">
              <p className="text-label">Current exercise</p>
              <p className="mt-1 text-[clamp(1.75rem,4vw,3.25rem)] font-extrabold leading-none tracking-[-0.03em] text-text">
                {activeCue.exerciseName}
              </p>
              <p className="mt-2 font-mono text-small tabular-nums text-muted">
                Active since {formatTime(activeCue.timestamp)}
              </p>
            </div>
          </>
        ) : (
          <div>
            <p className="text-label">Current exercise</p>
            <p className="mt-2 text-h2 font-bold text-text">Get ready</p>
            <p className="mt-1 text-small text-muted">The first cue will appear as the video reaches it.</p>
          </div>
        )}
      </div>

      {upcomingCues.length > 0 && (
        <div className="border-t border-border bg-surface-2/50 px-3 py-3 sm:px-4">
          <p className="text-label px-2">Up next</p>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {upcomingCues.map((cue) => (
              <button
                key={cue.id}
                onClick={() => onSeek(cue.timestamp)}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-muted motion-safe:transition-colors hover:bg-surface-3 hover:text-text active:bg-surface-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-text">
                  {cue.order}
                </span>
                <span className="min-w-0 flex-1 truncate text-small font-medium">{cue.exerciseName}</span>
                <span className="font-mono text-xs tabular-nums text-faint">{formatTime(cue.timestamp)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.32 11.45C2.81 6.98 7.03 3.75 12 3.75s9.18 3.22 10.68 7.69c.12.36.12.75 0 1.11-1.49 4.47-5.71 7.7-10.68 7.7S2.81 19.03 1.32 12.56a1.76 1.76 0 010-1.11zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>;
}

function EyeOffIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.68 12.55a11.25 11.25 0 01-2.63 4.31l-3.1-3.1a5.25 5.25 0 00-6.71-6.71L7.76 4.58A11.22 11.22 0 0112 3.75c4.97 0 9.19 3.22 10.68 7.69.12.36.12.75 0 1.11zM6.75 12c0-.62.11-1.21.3-1.76l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.36-.12.75 0 1.11 1.49 4.47 5.71 7.69 10.68 7.69 1.5 0 2.93-.29 4.24-.83l-2.48-2.47A5.25 5.25 0 016.75 12z" /></svg>;
}
