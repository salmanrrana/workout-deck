import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { ButtonSize, ButtonVariant } from "./Button";
import { Spinner } from "./Spinner";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong active:bg-accent-strong",
  secondary: "border border-border bg-surface-2 text-text hover:bg-surface-3 active:bg-surface-3",
  ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-text active:bg-surface-2",
  danger: "bg-danger/5 text-danger hover:bg-danger hover:text-bg-base active:bg-danger active:text-bg-base",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      children,
      className = "",
      disabled,
      loading = false,
      size = "md",
      type = "button",
      variant = "secondary",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`inline-flex shrink-0 items-center justify-center rounded-md motion-safe:transition motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? <Spinner size="sm" /> : children}
      </button>
    );
  },
);
