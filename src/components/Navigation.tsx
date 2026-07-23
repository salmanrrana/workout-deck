"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

type IconProps = { className?: string };

const navLinks = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/videos", label: "Videos", icon: VideoIcon },
  { href: "/timer", label: "Timer", icon: TimerIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
];

export function Navigation() {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    navLinks.findIndex(({ href }) =>
      href === "/" ? pathname === href : pathname.startsWith(`${href}/`) || pathname === href,
    ),
  );

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-border bg-surface-1/80 backdrop-blur supports-[backdrop-filter]:bg-surface-1/80">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          aria-label="WorkoutDeck home"
          className="flex min-h-11 shrink-0 items-center rounded-md active:scale-[0.98]"
        >
          <Logo size={28} withWordmark wordmarkClassName="hidden sm:inline" />
        </Link>

        <ul aria-label="WorkoutDeck sections" className="relative grid w-44 shrink-0 grid-cols-4 sm:w-[26rem]">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === href : pathname.startsWith(`${href}/`) || pathname === href;

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative z-10 flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-small font-semibold active:scale-[0.98] motion-safe:transition-colors motion-safe:[transition-duration:var(--dur)] ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-surface-2 hover:text-text"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="sr-only sm:not-sr-only">{label}</span>
                </Link>
              </li>
            );
          })}

          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/4 motion-safe:transition-transform motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)]"
            style={{ transform: `translateX(${activeIndex * 100}%)` } as CSSProperties}
          >
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent sm:inset-x-4" />
          </li>
        </ul>
      </nav>
    </header>
  );
}

function HomeIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3.5 10.5 8.5-7 8.5 7" />
      <path d="M5.5 9v10.5h13V9M9.5 19.5v-6h5v6" />
    </svg>
  );
}

function VideoIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TimerIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <circle cx="12" cy="13" r="8" />
      <path d="M9 2h6M12 5v2m0 6 3-3" />
    </svg>
  );
}

function HistoryIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.9 7.5A8 8 0 1 1 4 14" />
      <path d="M4 4v4h4M12 8v5l3 2" />
    </svg>
  );
}
