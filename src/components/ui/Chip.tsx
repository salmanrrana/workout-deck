import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export type ChipVariant = "neutral" | "accent" | "selected";

type ChipShared = {
  variant?: ChipVariant;
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
};

export type ChipClickableProps = ChipShared & {
  onClick: () => void;
  /** Toggle/filter pressed state exposed to assistive tech via aria-pressed. */
  pressed?: boolean;
  onRemove?: never;
  removeLabel?: never;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children" | "className" | "type">;

export type ChipRemovableProps = ChipShared & {
  onRemove: () => void;
  removeLabel?: string;
  onClick?: never;
  pressed?: never;
} & Omit<HTMLAttributes<HTMLSpanElement>, "onClick" | "children" | "className">;

export type ChipStaticProps = ChipShared & {
  onClick?: undefined;
  onRemove?: undefined;
  pressed?: never;
  removeLabel?: never;
} & Omit<HTMLAttributes<HTMLSpanElement>, "onClick" | "children" | "className">;

export type ChipProps = ChipClickableProps | ChipRemovableProps | ChipStaticProps;

const variantClasses: Record<ChipVariant, string> = {
  neutral: "bg-surface-2 text-muted hover:bg-surface-3 hover:text-text active:bg-surface-3",
  accent: "bg-accent/15 text-accent hover:bg-accent/25 active:bg-accent/25",
  selected: "bg-accent text-accent-fg hover:bg-accent-strong active:bg-accent-strong",
};

const sizeClasses = {
  sm: "min-h-7 px-2.5 text-xs",
  md: "min-h-9 px-3 text-small",
};

function chipClassName(
  variant: ChipVariant,
  size: "sm" | "md",
  interactive: boolean,
  className: string,
) {
  return `inline-flex items-center justify-center gap-1.5 rounded-full font-medium motion-safe:transition motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] ${interactive ? "cursor-pointer motion-safe:active:scale-[0.98]" : ""} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
}

export function Chip(props: ChipProps) {
  // Clickable and removable modes are exclusive — never nest interactive controls.
  if (typeof props.onClick === "function") {
    const {
      children,
      className = "",
      size = "md",
      variant = "neutral",
      onClick,
      pressed,
      ...rest
    } = props;

    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        className={chipClassName(variant, size, true, className)}
        {...rest}
      >
        {children}
      </button>
    );
  }

  if (typeof props.onRemove === "function") {
    const {
      children,
      className = "",
      size = "md",
      variant = "neutral",
      onRemove,
      removeLabel,
      ...rest
    } = props;

    return (
      <span
        className={chipClassName(variant, size, false, className)}
        {...rest}
      >
        {children}
        <button
          type="button"
          aria-label={removeLabel ?? `Remove ${typeof children === "string" ? children : "chip"}`}
          onClick={onRemove}
          className="-mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-surface-3 active:bg-surface-3 motion-safe:transition motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] motion-safe:active:scale-[0.98]"
        >
          <span aria-hidden="true">×</span>
        </button>
      </span>
    );
  }

  const {
    children,
    className = "",
    size = "md",
    variant = "neutral",
    ...rest
  } = props;

  return (
    <span
      className={chipClassName(variant, size, false, className)}
      {...rest}
    >
      {children}
    </span>
  );
}
