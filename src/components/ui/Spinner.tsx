import type { HTMLAttributes } from "react";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  /**
   * When provided, exposes an accessible loading status.
   * When omitted, the spinner stays decorative (aria-hidden) for labeled parents like Button.
   */
  label?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({ className = "", size = "md", label, ...props }: SpinnerProps) {
  const ringClassName = `inline-block shrink-0 animate-spin rounded-full border-border border-t-accent ${sizeClasses[size]}`;

  if (!label) {
    return (
      <span
        aria-hidden="true"
        className={`${ringClassName} ${className}`}
        {...props}
      />
    );
  }

  return (
    <span role="status" className={`inline-flex items-center justify-center ${className}`} {...props}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className={ringClassName} />
    </span>
  );
}
