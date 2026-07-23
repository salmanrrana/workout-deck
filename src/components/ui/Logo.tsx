import type { CSSProperties } from "react";

export interface LogoProps {
  className?: string;
  size?: number;
  withWordmark?: boolean;
}

/** WorkoutDeck's stacked-card play mark and optional wordmark lockup. */
export function Logo({ className = "", size = 24, withWordmark = false }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-[0.24em] text-accent ${className}`}
      style={{ fontSize: size } as CSSProperties}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        fill="none"
        className="h-[1em] w-[1em] shrink-0"
      >
        <path
          d="M5.5 10.5h16a4 4 0 0 1 4 4v9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
        />
        <path
          d="M7.5 7.5h16a4 4 0 0 1 4 4v9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.72"
        />
        <rect x="4.5" y="4.5" width="20" height="20" rx="5" fill="currentColor" />
        <path d="m13 10.5 7 4.5-7 4.5v-9Z" fill="var(--accent-fg)" />
      </svg>
      {withWordmark && (
        <span className="text-[0.72em] font-extrabold tracking-[-0.03em] text-text">
          WorkoutDeck
        </span>
      )}
    </span>
  );
}
