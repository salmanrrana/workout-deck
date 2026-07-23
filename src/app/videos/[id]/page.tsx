"use client";

/*
THESIS: A workout cockpit makes playback state, elapsed time, and the next physical action obvious; it refuses the equal-weight developer control stack.
OWN-WORLD: Graphite instrument surfaces, one green GO signal, semantic amber/red states, large mono measurement, and tactile tokenized controls.
STORY: See the exercise, read time and state at a glance, control playback, then log the effort; cue maintenance stays secondary.
FIRST VIEWPORT: A dominant 16:9 player sits left while a compact instrument rail puts elapsed time above transport and logging on the right.
FORM: Precision brief, cockpit hierarchy; concept seed not applicable because structure and visual system were explicitly pinned.
*/

import { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import { YouTubePlayer, useYouTubePlayer } from "@/components/YouTubePlayer";
import type { PlayerState } from "@/components/YouTubePlayer";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import { ExerciseCueOverlay } from "@/components/ExerciseCueOverlay";
import { CueEditor } from "@/components/CueEditor";
import { AutoExtractButton } from "@/components/AutoExtractButton";
import { Button, Card, Chip, EmptyState, IconButton, Spinner } from "@/components/ui";
import type { ExerciseCue } from "@/lib/types";
import { formatTime } from "@/lib/types";

type VideoProvider = "youtube" | "vimeo";

interface Video {
  id: string;
  youtubeId: string;
  provider?: VideoProvider;
  title: string;
  tags: string[];
  notes: string | null;
  cues: ExerciseCue[];
}

const statusPresentation: Record<
  PlayerState,
  { label: string; className: string; dotClassName: string }
> = {
  playing: {
    label: "Playing",
    className: "bg-accent/15 text-accent",
    dotClassName: "bg-accent",
  },
  paused: {
    label: "Paused",
    className: "bg-paused/15 text-paused",
    dotClassName: "bg-paused",
  },
  ended: {
    label: "Ended",
    className: "bg-danger/15 text-danger",
    dotClassName: "bg-danger",
  },
  buffering: {
    label: "Loading",
    className: "bg-surface-2 text-muted",
    dotClassName: "bg-muted motion-safe:animate-pulse",
  },
  unstarted: {
    label: "Ready",
    className: "bg-surface-2 text-muted",
    dotClassName: "bg-muted",
  },
  cued: {
    label: "Ready",
    className: "bg-surface-2 text-muted",
    dotClassName: "bg-muted",
  },
};

export default function VideoPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [activeCue, setActiveCue] = useState<ExerciseCue | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);

  const player = useYouTubePlayer();
  const updatePlayerState = player.handlers.onStateChange;
  const updatePlayerTime = player.handlers.onTimeUpdate;
  const handlePlayerReady = player.handlers.onReady;
  const prevCueRef = useRef<string | null>(null);
  const logTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    async function fetchVideo() {
      try {
        const res = await fetch(`/api/videos/${id}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Video not found" : "Failed to load video");
          return;
        }
        const data = await res.json();
        data.cues = Array.isArray(data.cues)
          ? data.cues.sort((a: ExerciseCue, b: ExerciseCue) => a.timestamp - b.timestamp)
          : [];
        setVideo(data);
      } catch (fetchError) {
        console.error("Failed to load video:", fetchError);
        setError("Failed to load video");
      } finally {
        setIsLoading(false);
      }
    }
    void fetchVideo();
  }, [id]);

  const handleStateChange = useCallback(
    (state: PlayerState) => {
      updatePlayerState(state);
      if (state === "playing") {
        setWorkoutStartTime((startedAt) => startedAt ?? Date.now());
      }
    },
    [updatePlayerState],
  );

  const handleTimeUpdate = useCallback(
    (time: number) => {
      updatePlayerTime(time);
      if (!video?.cues.length) return;

      let current: ExerciseCue | null = null;
      for (const cue of video.cues) {
        if (cue.timestamp <= time) current = cue;
        else break;
      }

      if (current?.id !== prevCueRef.current) {
        prevCueRef.current = current?.id ?? null;
        setActiveCue(current);
      }
    },
    [updatePlayerTime, video?.cues],
  );

  const handlePlayerError = useCallback(() => {
    setPlayerError("The video player could not start. Reload the page to try again.");
  }, []);

  const handleCuesChange = useCallback((newCues: ExerciseCue[]) => {
    setVideo((previous) => (previous ? { ...previous, cues: newCues } : previous));

    let current: ExerciseCue | null = null;
    for (const cue of newCues) {
      if (
        cue.timestamp <= player.currentTime
        && (!current || cue.timestamp >= current.timestamp)
      ) {
        current = cue;
      }
    }

    prevCueRef.current = current?.id ?? null;
    setActiveCue(current);
  }, [player.currentTime]);

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
        body: JSON.stringify({ videoId: video.id, duration }),
      });

      if (res.ok) {
        setLogSuccess(true);
        if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
        logTimeoutRef.current = setTimeout(() => setLogSuccess(false), 3000);
      } else {
        setLogError("Workout was not logged. Try again.");
      }
    } catch (logWorkoutError) {
      console.error("Failed to log workout:", logWorkoutError);
      setLogError("Connection lost. Check your network and try again.");
    } finally {
      setIsLogging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading workout" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="py-12">
        <EmptyState
          title={error || "Video not found"}
          description="Return to your deck and choose another workout."
          action={
            <Link
              href="/videos"
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 font-semibold text-accent-fg motion-safe:transition motion-safe:active:scale-[0.98]"
            >
              Back to library
            </Link>
          }
        />
      </div>
    );
  }

  const provider: VideoProvider = video.provider === "vimeo" ? "vimeo" : "youtube";
  const status = statusPresentation[player.state];
  const progress = player.duration > 0
    ? Math.min(100, Math.max(0, (player.currentTime / player.duration) * 100))
    : 0;
  const sharedPlayerProps = {
    videoId: video.youtubeId,
    onReady: handlePlayerReady,
    onStateChange: handleStateChange,
    onTimeUpdate: handleTimeUpdate,
    onPlayerRef: player.registerPlayer,
    onError: handlePlayerError,
    className: "w-full overflow-hidden rounded-lg bg-surface-1 [box-shadow:var(--shadow-card)]",
  };

  return (
    <div className="py-2 lg:py-6">
      <Link
        href="/videos"
        className="mb-4 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-small font-medium text-muted motion-safe:transition-colors hover:bg-surface-2 hover:text-text active:bg-surface-3"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        Back to library
      </Link>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22.5rem] xl:gap-7">
        <section aria-label="Workout video" className="min-w-0 space-y-4">
          {provider === "vimeo" ? (
            <VimeoPlayer {...sharedPlayerProps} />
          ) : (
            <YouTubePlayer {...sharedPlayerProps} />
          )}

          {playerError && (
            <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-small text-danger">
              {playerError}
            </p>
          )}

          <ExerciseCueOverlay
            activeCue={activeCue}
            cues={video.cues}
            currentTime={player.currentTime}
            onSeek={player.seekTo}
          />

          <Card as="section" padding="lg" className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-label">Now training</p>
                <h1 className="mt-2 text-h2 font-bold tracking-tight text-text sm:text-h1">
                  {video.title}
                </h1>
              </div>
              <Chip variant="neutral" size="sm">
                {provider === "vimeo" ? "Vimeo" : "YouTube"}
              </Chip>
            </div>
            {video.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {video.tags.map((tag) => (
                  <Chip key={tag} variant="neutral" size="sm">{tag}</Chip>
                ))}
              </div>
            )}
            {video.notes && (
              <p className="mt-4 max-w-prose text-small leading-relaxed text-muted">{video.notes}</p>
            )}
          </Card>
        </section>

        <aside aria-label="Workout controls" className="space-y-4 lg:sticky lg:top-20">
          <Card as="section" padding="lg" className="overflow-hidden text-center">
            <div className="flex items-center justify-between gap-3">
              <p className="text-label">Elapsed time</p>
              <span
                role="status"
                aria-live="polite"
                className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold ${status.className}`}
              >
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.dotClassName}`} />
                {status.label}
              </span>
            </div>

            <p className="mt-6 font-mono text-[clamp(3.75rem,7vw,5.5rem)] font-bold leading-none tracking-[-0.03em] tabular-nums text-text">
              {formatTime(player.currentTime)}
            </p>
            <p className="mt-3 font-mono text-small tabular-nums text-muted">
              of {formatTime(player.duration)}
            </p>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              <div
                className="h-full rounded-full bg-accent motion-safe:transition-[width] motion-safe:[transition-duration:var(--dur-fast)] motion-safe:[transition-timing-function:linear]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </Card>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            {player.state === "playing" ? (
              <Button
                onClick={player.pause}
                size="lg"
                fullWidth
                icon={<PauseIcon className="h-5 w-5" />}
              >
                Pause
              </Button>
            ) : (
              <Button
                onClick={player.play}
                disabled={!player.isReady}
                size="lg"
                fullWidth
                icon={<PlayIcon className="h-5 w-5" />}
              >
                {player.state === "ended" ? "Replay" : "Play"}
              </Button>
            )}
            <IconButton
              onClick={() => player.seekTo(0)}
              disabled={!player.isReady}
              size="lg"
              variant="secondary"
              aria-label="Restart video"
            >
              <RestartIcon className="h-5 w-5" />
            </IconButton>
          </div>

          <Button
            onClick={handleLogWorkout}
            disabled={!player.isReady}
            loading={isLogging}
            size="lg"
            variant="secondary"
            fullWidth
            icon={logSuccess ? <CheckIcon className="h-5 w-5" /> : <ClipboardIcon className="h-5 w-5" />}
            className={logSuccess ? "border-accent/40 bg-accent/15 text-accent" : ""}
          >
            {logSuccess ? "Workout logged" : "Log workout"}
          </Button>
          {logError && <p role="alert" className="px-2 text-center text-small text-danger">{logError}</p>}

          <details className="group rounded-lg bg-surface-1 [box-shadow:var(--shadow-card)]">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-5 text-left font-semibold text-muted motion-safe:transition-colors hover:bg-surface-2 hover:text-text active:bg-surface-3 [&::-webkit-details-marker]:hidden">
              <span>
                Workout cues
                <span className="ml-2 text-small font-normal text-faint">{video.cues.length}</span>
              </span>
              <ChevronDownIcon className="h-5 w-5 motion-safe:transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-4 border-t border-border p-4">
              {video.cues.length > 0 ? (
                <div>
                  <p className="text-label px-2">Cue timeline</p>
                  <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                    {video.cues.map((cue) => {
                      const isActive = activeCue?.id === cue.id;
                      return (
                        <button
                          key={cue.id}
                          onClick={() => player.seekTo(cue.timestamp)}
                          aria-current={isActive ? "true" : undefined}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left motion-safe:transition-colors active:bg-surface-3 ${
                            isActive
                              ? "bg-accent/15 text-accent"
                              : "text-muted hover:bg-surface-2 hover:text-text"
                          }`}
                        >
                          <span className="shrink-0 font-mono text-xs tabular-nums text-faint">
                            {formatTime(cue.timestamp)}
                          </span>
                          <span className="text-small font-medium">{cue.exerciseName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="px-2 text-small leading-relaxed text-muted">
                  {provider === "youtube"
                    ? "No cues yet. Add them manually or extract them from the transcript."
                    : "No cues yet. Add them manually to build your workout timeline."}
                </p>
              )}
              <div className="space-y-3 border-t border-border pt-4">
                {provider === "youtube" && (
                  <AutoExtractButton videoId={video.id} onCuesExtracted={handleCuesChange} />
                )}
                <CueEditor
                  videoId={video.id}
                  cues={video.cues}
                  currentTime={player.currentTime}
                  onCuesChange={handleCuesChange}
                />
              </div>
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" /></svg>;
}

function ChevronDownIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" /></svg>;
}

function PlayIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M5 4.6a1.5 1.5 0 012.25-1.3l12 7.4a1.5 1.5 0 010 2.6l-12 7.4A1.5 1.5 0 015 19.4V4.6z" /></svg>;
}

function PauseIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M6.75 4.5A1.25 1.25 0 005.5 5.75v12.5a1.25 1.25 0 002.5 0V5.75A1.25 1.25 0 006.75 4.5zm10.5 0A1.25 1.25 0 0016 5.75v12.5a1.25 1.25 0 002.5 0V5.75a1.25 1.25 0 00-1.25-1.25z" /></svg>;
}

function RestartIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path fillRule="evenodd" d="M4.76 10.06A7.5 7.5 0 0117.3 6.7l1.9 1.9h-4.95a.75.75 0 000 1.5h6a.75.75 0 00.75-.75v-6a.75.75 0 00-1.5 0v3.07l-1.66-1.66A9 9 0 003.27 9.35a.75.75 0 001.49.71zm14.48 3.88A7.5 7.5 0 016.7 17.3l-1.9-1.9h4.95a.75.75 0 000-1.5h-6a.75.75 0 00-.75.75v6a.75.75 0 001.5 0v-3.07l1.66 1.66a9 9 0 0014.57-4.59.75.75 0 00-1.49-.71z" clipRule="evenodd" /></svg>;
}

function CheckIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path fillRule="evenodd" d="M19.92 4.63a.75.75 0 01.2 1.04l-9 13.5a.75.75 0 01-1.15.11l-6-6a.75.75 0 011.06-1.06l5.35 5.35 8.5-12.74a.75.75 0 011.04-.2z" clipRule="evenodd" /></svg>;
}

function ClipboardIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path fillRule="evenodd" d="M9 3.75A2.25 2.25 0 0111.25 1.5h1.5A2.25 2.25 0 0115 3.75h1.5A2.25 2.25 0 0118.75 6v14.25a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25V6A2.25 2.25 0 017.5 3.75H9zm2.25-.75a.75.75 0 00-.75.75v.75h3v-.75a.75.75 0 00-.75-.75h-1.5z" clipRule="evenodd" /></svg>;
}
