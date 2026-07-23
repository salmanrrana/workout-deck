"use client";

/**
 * THESIS: A workout timer should read like an instrument, not a settings page.
 * OWN-WORLD: Graphite surfaces, one semantic phase color, oversized mono numerals, tactile controls.
 * STORY: Configure a sequence, start with a count-in, then read phase, time, and round at a glance.
 * FIRST VIEWPORT: The progress-ring countdown owns the left side; presets and configuration form a narrow right rail.
 * FORM: A precisely specified cockpit extension of WorkoutDeck's established visual system; no concept seed required.
 */

import { useEffect, useReducer, useRef, type CSSProperties } from "react";
import { Button, Card, Chip, Input } from "@/components/ui";
import { enableAudio, playSound } from "@/lib/audio";

type ActivePhase = "countIn" | "work" | "rest";
type Phase = "idle" | ActivePhase | "complete";

type TimerConfig = {
  work: number;
  rest: number;
  rounds: number;
};

type TimerState = TimerConfig & {
  phase: Phase;
  remaining: number;
  round: number;
  running: boolean;
  paused: boolean;
};

type TimerAction =
  | { type: "configure"; config: TimerConfig }
  | { type: "start"; config: TimerConfig }
  | { type: "elapse"; seconds: number }
  | { type: "togglePause" }
  | { type: "skip" }
  | { type: "reset"; config: TimerConfig };

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: EventTarget["addEventListener"];
  removeEventListener: EventTarget["removeEventListener"];
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

const DEFAULT_CONFIG: TimerConfig = { work: 40, rest: 20, rounds: 6 };
const COUNT_IN_SECONDS = 3;
const RING_RADIUS = 138;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const PRESETS: Array<TimerConfig & { name: string; detail: string }> = [
  { name: "Tabata", detail: "20 / 10 × 8", work: 20, rest: 10, rounds: 8 },
  { name: "EMOM", detail: "50 / 10 × 10", work: 50, rest: 10, rounds: 10 },
  { name: "30 / 30", detail: "30 / 30 × 6", work: 30, rest: 30, rounds: 6 },
];

function initialState(config: TimerConfig): TimerState {
  return {
    ...config,
    phase: "idle",
    remaining: config.work,
    round: 1,
    running: false,
    paused: false,
  };
}

function advance(state: TimerState): TimerState {
  if (state.phase === "countIn") {
    return { ...state, phase: "work", remaining: state.work };
  }

  if (state.phase === "work") {
    if (state.round >= state.rounds) {
      return { ...state, phase: "complete", remaining: 0, running: false, paused: false };
    }
    return { ...state, phase: "rest", remaining: state.rest };
  }

  if (state.phase === "rest") {
    return { ...state, phase: "work", remaining: state.work, round: state.round + 1 };
  }

  return state;
}

function elapse(state: TimerState, seconds: number): TimerState {
  if (!state.running || state.paused) return state;

  let next = state;
  let pending = Math.max(0, Math.floor(seconds));

  while (pending > 0 && next.running) {
    const secondsUntilAdvance = next.phase === "countIn"
      ? next.remaining + 1
      : next.remaining;

    if (pending < secondsUntilAdvance) {
      return { ...next, remaining: next.remaining - pending };
    }

    pending -= secondsUntilAdvance;
    next = advance(next);
  }

  return next;
}

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case "configure":
      return state.phase === "idle" ? initialState(action.config) : state;
    case "start":
      return {
        ...action.config,
        phase: "countIn",
        remaining: COUNT_IN_SECONDS,
        round: 1,
        running: true,
        paused: false,
      };
    case "elapse":
      return elapse(state, action.seconds);
    case "togglePause":
      return state.running ? { ...state, paused: !state.paused } : state;
    case "skip":
      return state.running ? advance(state) : state;
    case "reset":
      return initialState(action.config);
  }
}

function clampInteger(value: string, minimum: number, maximum: number, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function phaseLabel(phase: Phase) {
  switch (phase) {
    case "countIn":
      return "GET READY";
    case "work":
      return "WORK";
    case "rest":
      return "REST";
    case "complete":
      return "COMPLETE";
    default:
      return "READY";
  }
}

function phaseColor(state: TimerState) {
  if (state.paused) return "var(--paused)";
  if (state.phase === "rest") return "var(--rest)";
  if (state.phase === "complete") return "var(--accent)";
  return "var(--work)";
}

function statusLabel(state: TimerState) {
  if (state.paused) return "Paused";
  if (state.phase === "complete") return "Complete";
  if (state.running) return "Running";
  return "Ready";
}

export default function TimerPage() {
  const [config, setConfig] = useReducer(
    (current: TimerConfig, next: Partial<TimerConfig>) => ({ ...current, ...next }),
    DEFAULT_CONFIG,
  );
  const [timer, dispatch] = useReducer(timerReducer, DEFAULT_CONFIG, initialState);
  const previousPhase = useRef<Phase>(timer.phase);
  const lastReconciledAt = useRef<number | null>(null);

  useEffect(() => {
    if (!timer.running || timer.paused) {
      lastReconciledAt.current = null;
      return;
    }

    lastReconciledAt.current = Date.now();
    const reconcileElapsedTime = () => {
      const now = Date.now();
      const previous = lastReconciledAt.current ?? now;
      const elapsedSeconds = Math.floor((now - previous) / 1000);
      if (elapsedSeconds < 1) return;

      lastReconciledAt.current = previous + elapsedSeconds * 1000;
      dispatch({ type: "elapse", seconds: elapsedSeconds });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") reconcileElapsedTime();
    };
    const interval = window.setInterval(reconcileElapsedTime, 1000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      lastReconciledAt.current = null;
    };
  }, [timer.running, timer.paused]);

  useEffect(() => {
    const oldPhase = previousPhase.current;
    previousPhase.current = timer.phase;
    if (oldPhase === timer.phase) return;

    if (timer.phase === "work") playSound("intervalStart");
    if (timer.phase === "rest") playSound("intervalEnd");
    if (timer.phase === "complete") playSound("workoutComplete");
  }, [timer.phase]);

  useEffect(() => {
    if (!timer.running || timer.paused) return;
    if (timer.phase === "countIn" && timer.remaining > 0) playSound("intervalStart");
    if ((timer.phase === "work" || timer.phase === "rest") && timer.remaining === 3) {
      playSound("warning");
    }
  }, [timer.phase, timer.remaining, timer.running, timer.paused]);

  useEffect(() => {
    if (!timer.running || timer.paused) return;
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
    if (!wakeLock) return;

    let active = true;
    let requestInFlight = false;
    let sentinel: WakeLockSentinelLike | null = null;

    const requestWakeLock = async () => {
      if (!active || requestInFlight || sentinel || document.visibilityState !== "visible") return;

      requestInFlight = true;
      try {
        const lock = await wakeLock.request("screen");
        if (!active) {
          void lock.release();
          return;
        }
        sentinel = lock;
        lock.addEventListener("release", handleRelease, { once: true });
      } catch {
        // Wake Lock is a progressive enhancement; the timer remains fully usable.
      } finally {
        requestInFlight = false;
      }
    };
    const handleRelease = () => {
      sentinel = null;
      void requestWakeLock();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void requestWakeLock();

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const currentSentinel = sentinel;
      sentinel = null;
      if (currentSentinel) {
        currentSentinel.removeEventListener("release", handleRelease);
        void currentSentinel.release();
      }
    };
  }, [timer.running, timer.paused]);

  const updateConfig = (key: keyof TimerConfig, value: string) => {
    const limits = key === "rounds" ? { minimum: 1, maximum: 99 } : { minimum: 1, maximum: 3599 };
    const next = {
      ...config,
      [key]: clampInteger(value, limits.minimum, limits.maximum, config[key]),
    };
    setConfig(next);
    dispatch({ type: "configure", config: next });
  };

  const applyPreset = (preset: TimerConfig) => {
    setConfig(preset);
    dispatch({ type: "configure", config: preset });
  };

  const start = async () => {
    await enableAudio();
    dispatch({ type: "start", config });
  };

  const skipInterval = () => {
    lastReconciledAt.current = Date.now();
    dispatch({ type: "skip" });
  };

  const activeTotal = timer.phase === "countIn"
    ? COUNT_IN_SECONDS
    : timer.phase === "rest"
      ? timer.rest
      : timer.work;
  const progress = timer.phase === "complete" ? 0 : Math.max(0, timer.remaining / activeTotal);
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const displayTime = timer.phase === "countIn" && timer.remaining === 0
    ? "GO"
    : timer.phase === "countIn"
      ? String(timer.remaining)
      : formatSeconds(timer.remaining);
  const currentPhaseLabel = phaseLabel(timer.phase);
  const controlsLocked = timer.phase !== "idle";
  const pageStyle = { "--timer-color": phaseColor(timer) } as CSSProperties;
  const finalSeconds = (timer.phase === "work" || timer.phase === "rest") && timer.remaining <= 3;
  const liveMessage = timer.phase === "complete"
    ? "Workout complete"
    : `${currentPhaseLabel}. Round ${timer.round} of ${timer.rounds}${timer.paused ? ". Paused" : ""}`;

  return (
    <div className="timer-instrument -mx-4 -my-6 min-h-[calc(100dvh-4rem)] overflow-hidden px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" style={pageStyle}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{liveMessage}</div>

      <header className="mx-auto mb-5 flex max-w-7xl items-end justify-between gap-4">
        <div>
          <p className="text-small font-semibold text-[var(--timer-color)]">Workout instrument</p>
          <h1 className="mt-1 text-h1 font-bold tracking-tight text-text">Interval Timer</h1>
        </div>
        <div className="inline-flex min-h-9 items-center gap-2 rounded-full bg-surface-2 px-3 text-small font-semibold text-text" role="status">
          <span className="h-2 w-2 rounded-full bg-[var(--timer-color)]" aria-hidden="true" />
          {statusLabel(timer)}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <section className="flex min-h-[34rem] flex-col items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--timer-color)_5%,var(--surface-1))] px-4 py-6 [box-shadow:var(--shadow-card)] sm:px-8 lg:min-h-[calc(100dvh-9.5rem)]" aria-label="Active timer">
          <div className="flex w-full items-center justify-between gap-3 text-small text-muted">
            <span>{timer.work}s work · {timer.rest}s rest</span>
            <span className="font-mono tabular-nums">{timer.round} / {timer.rounds}</span>
          </div>

          <div className="relative my-4 grid w-full max-w-[33rem] place-items-center">
            <svg className="h-auto w-full -rotate-90" viewBox="0 0 320 320" role="img" aria-label={`${Math.round(progress * 100)} percent of interval remaining`}>
              <circle cx="160" cy="160" r={RING_RADIUS} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
              <circle
                className="timer-progress-ring"
                cx="160"
                cy="160"
                r={RING_RADIUS}
                fill="none"
                stroke="var(--timer-color)"
                strokeLinecap="round"
                strokeWidth="10"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-label font-bold text-[var(--timer-color)]">{currentPhaseLabel}</p>
              <div
                key={timer.phase === "countIn" ? displayTime : timer.phase}
                className={`font-mono text-[clamp(4.5rem,14vw,10rem)] font-bold leading-none tracking-[-0.03em] text-text tabular-nums ${timer.phase === "countIn" ? "timer-count-in" : ""} ${finalSeconds ? "timer-final-pulse" : ""}`}
                role="timer"
                aria-label={`${currentPhaseLabel} ${displayTime}`}
              >
                {displayTime}
              </div>
              <p className="mt-3 text-body font-semibold text-muted">Round {timer.round} of {timer.rounds}</p>
            </div>
          </div>

          <div className="w-full max-w-3xl">
            <div className="mb-5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${timer.rounds}, minmax(0, 1fr))` }} aria-label={`Round ${timer.round} of ${timer.rounds}`}>
              {Array.from({ length: timer.rounds }, (_, index) => {
                const round = index + 1;
                const complete = round < timer.round || timer.phase === "complete";
                const active = round === timer.round && timer.phase !== "complete";
                return (
                  <span
                    key={round}
                    className={`h-2 rounded-full ${complete || active ? "bg-[var(--timer-color)]" : "bg-surface-3"} ${active ? "opacity-100" : complete ? "opacity-65" : "opacity-100"}`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {timer.phase === "idle" || timer.phase === "complete" ? (
                <Button size="lg" className="min-w-40" onClick={start}>
                  {timer.phase === "complete" ? "Start again" : "Start timer"}
                </Button>
              ) : (
                <Button size="lg" className="min-w-40" onClick={() => dispatch({ type: "togglePause" })}>
                  {timer.paused ? "Resume" : "Pause"}
                </Button>
              )}
              <Button size="lg" variant="secondary" onClick={() => dispatch({ type: "reset", config })}>
                Reset
              </Button>
              <Button size="lg" variant="ghost" disabled={!timer.running} onClick={skipInterval}>
                Skip interval
              </Button>
            </div>
          </div>
        </section>

        <Card as="aside" padding="lg" className="lg:sticky lg:top-20" aria-label="Timer configuration">
          <div className="mb-6">
            <p className="text-small font-semibold text-[var(--timer-color)]">Sequence</p>
            <h2 className="mt-1 text-h2 font-bold text-text">Build your intervals</h2>
            <p className="mt-2 text-small leading-relaxed text-muted">
              Choose a preset or tune each interval. Reset the timer to edit during a session.
            </p>
          </div>

          <div className="mb-6 flex flex-wrap gap-2" aria-label="Timer presets">
            {PRESETS.map((preset) => {
              const selected = config.work === preset.work && config.rest === preset.rest && config.rounds === preset.rounds;
              return (
                <Chip
                  key={preset.name}
                  variant={selected ? "selected" : "neutral"}
                  pressed={selected}
                  disabled={controlsLocked}
                  className="h-auto min-h-11 flex-col gap-0 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => applyPreset(preset)}
                  aria-label={`${preset.name}: ${preset.detail}`}
                >
                  <span>{preset.name}</span>
                  <span className="text-xs opacity-75">{preset.detail}</span>
                </Chip>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <Input
              label="Work seconds"
              type="number"
              inputMode="numeric"
              min={1}
              max={3599}
              value={config.work}
              disabled={controlsLocked}
              onChange={(event) => updateConfig("work", event.target.value)}
            />
            <Input
              label="Rest seconds"
              type="number"
              inputMode="numeric"
              min={1}
              max={3599}
              value={config.rest}
              disabled={controlsLocked}
              onChange={(event) => updateConfig("rest", event.target.value)}
            />
            <Input
              label="Rounds"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={config.rounds}
              disabled={controlsLocked}
              onChange={(event) => updateConfig("rounds", event.target.value)}
            />
          </div>

          <div className="mt-6 rounded-md bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-3 text-small">
              <span className="text-muted">Total session</span>
              <strong className="font-mono text-text tabular-nums">
                {formatSeconds(config.work * config.rounds + config.rest * Math.max(0, config.rounds - 1))}
              </strong>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-faint">Audio cues and screen wake lock activate when supported.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
