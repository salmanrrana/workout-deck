import type { HTMLAttributes, KeyboardEvent, MouseEvent } from "react";

export type ChipVariant = "neutral" | "accent" | "selected";

export interface ChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "onClick"> {
  variant?: ChipVariant;
  size?: "sm" | "md";
  onClick?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}

const variantClasses: Record<ChipVariant, string> = {
  neutral: "bg-surface-2 text-muted hover:bg-surface-3 hover:text-text",
  accent: "bg-accent/15 text-accent hover:bg-accent/25",
  selected: "bg-accent text-accent-fg hover:bg-accent-strong",
};

const sizeClasses = {
  sm: "min-h-7 px-2.5 text-xs",
  md: "min-h-9 px-3 text-small",
};

export function Chip({
  children,
  className = "",
  onClick,
  onRemove,
  removeLabel,
  size = "md",
  variant = "neutral",
  ...props
}: ChipProps) {
  const interactive = Boolean(onClick);
  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (onClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick();
    }
  };
  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove?.();
  };

  return (
    <span
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition ${interactive ? "cursor-pointer active:scale-[0.98]" : ""} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={{ transitionDuration: "var(--dur)", transitionTimingFunction: "var(--ease)" }}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel ?? `Remove ${typeof children === "string" ? children : "chip"}`}
          onClick={handleRemove}
          className="-mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-surface-3 active:scale-[0.98]"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </span>
  );
}
