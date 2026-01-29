"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import { YouTubePlayer, useYouTubePlayer } from "@/components/YouTubePlayer";
import type { PlayerState } from "@/components/YouTubePlayer";
import { ExerciseCueOverlay } from "@/components/ExerciseCueOverlay";

interface ExerciseCue {
  id: string;
  videoId: string;
  timestamp: number;
  exerciseName: string;
  order: number;
}

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  tags: string[];
  notes: string | null;
  cues: ExerciseCue[];
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function stateColor(state: PlayerState): string {
  switch (state) {
    case "playing":
      return "bg-green-500";
    case "paused":
      return "bg-yellow-500";
    case "ended":
      return "bg-red-500";
    default:
      return "bg-zinc-500";
  }
}

export default function VideoPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCue, setActiveCue] = useState<ExerciseCue | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);

  const player = useYouTubePlayer();
  const prevCueRef = useRef<string | null>(null);
  const logTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup setTimeout on unmount
  useEffect(() => {
    return () => {
      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    };
  }, []);

  // Fetch video data
  useEffect(() => {
    async function fetchVideo() {
      try {
        const res = await fetch(`/api/videos/${id}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Video not found" : "Failed to load video");
          return;
        }
        const data = await res.json();
        // Defensively sort cues by timestamp for correct overlay syncing
        if (Array.isArray(data.cues)) {
          data.cues.sort((a: ExerciseCue, b: ExerciseCue) => a.timestamp - b.timestamp);
        }
        setVideo(data);
      } catch (err) {
        console.error("Failed to load video:", err);
        setError("Failed to load video");
      } finally {
        setIsLoading(false);
      }
    }
    fetchVideo();
  }, [id]);

  // Track workout start time
  const handleStateChange = useCallback(
    (state: PlayerState) => {
      player.handlers.onStateChange(state);
      if (state === "playing" && workoutStartTime === null) {
        setWorkoutStartTime(Date.now());
      }
    },
    [player.handlers, workoutStartTime]
  );

  // Sync exercise cues with playback time
  const handleTimeUpdate = useCallback(
    (time: number) => {
      player.handlers.onTimeUpdate(time);

      if (!video?.cues.length) return;

      // Find the active cue: the most recent cue whose timestamp <= current time
      let current: ExerciseCue | null = null;
      for (const cue of video.cues) {
        if (cue.timestamp <= time) {
          current = cue;
        } else {
          break; // cues are sorted by order/timestamp
        }
      }

      if (current?.id !== prevCueRef.current) {
        prevCueRef.current = current?.id ?? null;
        setActiveCue(current);
      }
    },
    [player.handlers, video?.cues]
  );

  // Log workout
  const handleLogWorkout = async () => {
    if (!video || isLogging) return;
    setIsLogging(true);
    setLogError(null);
    try {
      const duration = workoutStartTime
        ? Math.floor((Date.now() - workoutStartTime) / 1000)
        : Math.floor(player.currentTime);

      const res = await fetch("/api/workout-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          duration,
        }),
      });

      if (res.ok) {
        setLogSuccess(true);
        if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
        logTimeoutRef.current = setTimeout(() => setLogSuccess(false), 3000);
      } else {
        setLogError("Failed to log workout. Please try again.");
      }
    } catch (err) {
      console.error("Failed to log workout:", err);
      setLogError("Network error. Check your connection and try again.");
    } finally {
      setIsLogging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-zinc-400">{error || "Video not found"}</p>
        <Link
          href="/videos"
          className="mt-4 inline-block text-green-500 underline hover:text-green-400"
        >
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="py-4 lg:py-8">
      {/* Back link */}
      <Link
        href="/videos"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-zinc-400 transition-colors hover:text-white"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        Back to library
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left column: Player + Info */}
        <div className="space-y-4">
          {/* YouTube Player */}
          <YouTubePlayer
            videoId={video.youtubeId}
            onReady={player.handlers.onReady}
            onStateChange={handleStateChange}
            onTimeUpdate={handleTimeUpdate}
            onPlayerRef={player.registerPlayer}
            className="w-full overflow-hidden rounded-xl"
          />

          {/* Exercise Cue Overlay */}
          <ExerciseCueOverlay
            activeCue={activeCue}
            cues={video.cues}
            currentTime={player.currentTime}
            onSeek={player.seekTo}
          />

          {/* Video Info */}
          <div className="rounded-xl bg-zinc-900 p-4">
            <h1 className="text-xl font-bold sm:text-2xl">{video.title}</h1>
            {video.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {video.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {video.notes && (
              <p className="mt-3 text-sm text-zinc-400">{video.notes}</p>
            )}
          </div>
        </div>

        {/* Right column: Timer + Controls */}
        <div className="space-y-4">
          {/* Playback Timer Panel */}
          <div className="rounded-xl bg-zinc-900 p-6 text-center">
            <p className="text-sm font-medium text-zinc-400">Elapsed</p>
            <p className="mt-1 font-mono text-5xl font-bold tabular-nums text-white">
              {formatTime(player.currentTime)}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              / {formatTime(player.duration)}
            </p>

            {/* Playback state indicator */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${stateColor(player.state)}`}
              />
              <span className="text-sm capitalize text-zinc-400">
                {player.state}
              </span>
            </div>
          </div>

          {/* Video Controls */}
          <div className="flex gap-2">
            {player.state === "playing" ? (
              <button
                onClick={player.pause}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-600"
              >
                <PauseIcon className="h-5 w-5" />
                Pause
              </button>
            ) : (
              <button
                onClick={player.play}
                disabled={!player.isReady}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                <PlayIcon className="h-5 w-5" />
                {player.state === "ended" ? "Replay" : "Play"}
              </button>
            )}
            <button
              onClick={() => player.seekTo(0)}
              disabled={!player.isReady}
              className="flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-700 px-4 py-2 text-white transition-colors hover:bg-zinc-600 disabled:opacity-50"
            >
              <RestartIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Log Workout */}
          <button
            onClick={handleLogWorkout}
            disabled={isLogging || !player.isReady}
            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-colors ${
              logSuccess
                ? "bg-green-800 text-green-200"
                : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            }`}
          >
            <LogWorkoutButtonContent
              logSuccess={logSuccess}
              isLogging={isLogging}
            />
          </button>
          {logError && (
            <p className="text-center text-sm text-red-400">{logError}</p>
          )}

          {/* Exercise Cues List */}
          {video.cues.length > 0 && (
            <div className="rounded-xl bg-zinc-900 p-4">
              <h2 className="mb-3 text-sm font-medium text-zinc-400">
                Exercise Cues
              </h2>
              <div className="space-y-1">
                {video.cues.map((cue) => (
                  <button
                    key={cue.id}
                    onClick={() => player.seekTo(cue.timestamp)}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      activeCue?.id === cue.id
                        ? "bg-green-600/20 text-green-400"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="shrink-0 font-mono text-xs text-zinc-500">
                      {formatTime(cue.timestamp)}
                    </span>
                    <span className="text-sm">{cue.exerciseName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Log workout button content - extracted to avoid nested ternary
function LogWorkoutButtonContent({
  logSuccess,
  isLogging,
}: {
  logSuccess: boolean;
  isLogging: boolean;
}) {
  if (logSuccess) {
    return (
      <>
        <CheckIcon className="h-5 w-5" />
        Workout Logged!
      </>
    );
  }

  if (isLogging) {
    return <>Logging...</>;
  }

  return (
    <>
      <ClipboardIcon className="h-5 w-5" />
      Log Workout
    </>
  );
}

// Icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function RestartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903H14.25a.75.75 0 000 1.5h6a.75.75 0 00.75-.75v-6a.75.75 0 00-1.5 0v3.068l-1.658-1.658A9 9 0 013.27 9.348a.75.75 0 001.486.211zm14.49 3.882a7.5 7.5 0 01-12.548 3.364l-1.903-1.903H9.75a.75.75 0 000-1.5h-6a.75.75 0 00-.75.75v6a.75.75 0 001.5 0v-3.068l1.658 1.658A9 9 0 0020.73 14.652a.75.75 0 00-1.486-.211z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}
