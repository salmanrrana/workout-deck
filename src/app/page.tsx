/*
 * THESIS: WorkoutDeck is a ready training deck, not a menu of colored features.
 * OWN-WORLD: Layered graphite surfaces, one signal-green action, and a stacked-card mark.
 * STORY: Recognize the workout companion, start a video, or choose a supporting tool.
 * FIRST VIEWPORT: A glow-backed lockup and dominant CTA lead into three neutral deck entries.
 * FORM: A restrained athletic dashboard shaped directly from the ticket's prescribed structure.
 */
import Link from "next/link";
import { MomentumPanel } from "@/components/MomentumPanel";
import { Card, Logo } from "@/components/ui";
import { buttonClassName } from "@/components/ui/Button";

const destinations = [
  {
    href: "/videos",
    title: "Workout videos",
    description: "Pick a saved session and follow your exercise cues.",
    icon: VideoIcon,
  },
  {
    href: "/timer",
    title: "Interval timer",
    description: "Run focused work and rest intervals without a video.",
    icon: TimerIcon,
  },
  {
    href: "/history",
    title: "Workout history",
    description: "Look back on completed sessions and keep your rhythm.",
    icon: HistoryIcon,
  },
];

export default function Home() {
  return (
    <div className="relative isolate overflow-hidden py-10 sm:py-14 lg:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-[min(48rem,100%)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--accent-glow)_0%,transparent_70%)] opacity-35 motion-safe:transition-opacity motion-safe:[transition-duration:var(--dur-slow)]"
      />

      <section className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1>
          <Logo size="clamp(3rem, 12vw, 4rem)" withWordmark />
        </h1>
        <p className="mt-7 max-w-2xl text-balance text-h2 font-semibold tracking-[-0.02em] text-text sm:text-display-xl">
          Build your deck. Press play. Stay in motion.
        </p>
        <p className="mt-4 max-w-[65ch] text-body text-muted sm:text-lg">
          Your workout videos, interval timing, and exercise cues—together in one
          focused training companion.
        </p>
        <Link
          href="/videos"
          className={buttonClassName({
            size: "lg",
            className: "mt-8 min-w-56 shadow-[0_12px_32px_-16px_var(--accent-glow)]",
          })}
        >
          Start a workout
          <ArrowIcon className="h-5 w-5" />
        </Link>
      </section>

      <MomentumPanel />

      <section aria-labelledby="deck-heading" className="mx-auto mt-16 max-w-6xl sm:mt-20">
        <div className="mb-6 sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="text-label">Your training deck</p>
            <h2 id="deck-heading" className="mt-2 text-h2 font-bold tracking-tight sm:text-h1">
              Choose where to move next
            </h2>
          </div>
          <p className="mt-3 max-w-md text-small text-muted sm:mt-0 sm:text-right">
            Start with a saved workout, run the timer solo, or revisit your progress.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
          {destinations.map(({ href, title, description, icon: Icon }) => (
            <Card
              key={href}
              as="a"
              href={href}
              interactive
              bordered
              padding="none"
              className="group flex min-h-48 flex-col p-6 sm:p-7"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-2 text-muted motion-safe:transition-colors motion-safe:[transition-duration:var(--dur)] group-hover:text-accent group-focus-visible:text-accent">
                <Icon className="h-6 w-6" />
              </span>
              <span className="mt-8 flex items-center justify-between gap-4">
                <span className="text-h3 font-bold text-text">{title}</span>
                <ArrowIcon className="h-5 w-5 shrink-0 text-faint motion-safe:transition motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] motion-safe:group-hover:translate-x-1 group-hover:text-accent group-focus-visible:text-accent" />
              </span>
              <span className="mt-2 text-body text-muted">{description}</span>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <circle cx="12" cy="13" r="8" />
      <path d="M9 2h6M12 5v2m0 6 3-3" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.9 7.5A8 8 0 1 1 4 14" />
      <path d="M4 4v4h4M12 8v5l3 2" />
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
