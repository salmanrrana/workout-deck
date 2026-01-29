"use client";

import { useState } from "react";

interface ExerciseCue {
  id: string;
  videoId: string;
  timestamp: number;
  exerciseName: string;
  order: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

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

  // Find upcoming cues (next 1-2 after active)
  const upcomingCues: ExerciseCue[] = [];
  let foundActive = activeCue === null;
  for (const cue of cues) {
    if (foundActive && cue.timestamp > currentTime) {
      upcomingCues.push(cue);
      if (upcomingCues.length >= 2) break;
    }
    if (cue.id === activeCue?.id) {
      foundActive = true;
    }
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700/80"
        aria-label={visible ? "Hide exercise overlay" : "Show exercise overlay"}
      >
        {visible ? (
          <EyeIcon className="h-4 w-4" />
        ) : (
          <EyeOffIcon className="h-4 w-4" />
        )}
      </button>

      {visible ? (
        <div className="rounded-xl bg-zinc-900/90 p-5 backdrop-blur-sm">
          {/* Active cue - large, high-contrast display */}
          {activeCue ? (
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-600/20">
                <span className="text-lg font-bold text-white">
                  {activeCue.order}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-extrabold tracking-tight text-white">
                  {activeCue.exerciseName}
                </p>
                <p className="mt-0.5 text-sm text-zinc-400">
                  Since {formatTime(activeCue.timestamp)}
                </p>
              </div>
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-zinc-500">
              Waiting for first exercise cue...
            </p>
          )}

          {/* Upcoming cues - smaller text */}
          {upcomingCues.length > 0 && (
            <div className="mt-4 space-y-1 border-t border-zinc-800 pt-3">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Up next
              </p>
              {upcomingCues.map((cue) => (
                <button
                  key={cue.id}
                  onClick={() => onSeek(cue.timestamp)}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-800/70"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
                    {cue.order}
                  </span>
                  <span className="text-sm text-zinc-300">
                    {cue.exerciseName}
                  </span>
                  <span className="ml-auto font-mono text-xs text-zinc-500">
                    {formatTime(cue.timestamp)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-zinc-900/60 px-4 py-3 backdrop-blur-sm">
          <p className="text-center text-sm text-zinc-500">
            Overlay hidden
          </p>
        </div>
      )}
    </div>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path
        fillRule="evenodd"
        d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" />
      <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z" />
      <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" />
    </svg>
  );
}
