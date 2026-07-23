import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong active:bg-accent-strong",
  secondary: "border border-border bg-surface-2 text-text hover:bg-surface-3 active:bg-surface-3",
  ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-text active:bg-surface-2",
  danger: "bg-danger/5 text-danger hover:bg-danger hover:text-bg-base active:bg-danger active:text-bg-base",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-small",
  md: "h-11 px-4 text-body",
  lg: "h-14 px-6 text-body",
};

type ButtonClassNameOptions = Pick<ButtonProps, "className" | "fullWidth" | "size" | "variant">;

export function buttonClassName({
  className = "",
  fullWidth = false,
  size = "md",
  variant = "primary",
}: ButtonClassNameOptions = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-md font-semibold motion-safe:transition motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className = "",
    disabled,
    fullWidth = false,
    icon,
    iconRight,
    loading = false,
    size = "md",
    type = "button",
    variant = "primary",
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
      className={buttonClassName({ className, fullWidth, size, variant })}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});
