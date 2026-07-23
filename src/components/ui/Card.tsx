import type { ElementType, HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  bordered?: boolean;
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  as: Component = "div",
  bordered = false,
  className = "",
  interactive = false,
  padding = "md",
  style,
  ...props
}: CardProps) {
  return (
    <Component
      className={`rounded-lg bg-surface-1 [box-shadow:var(--shadow-card)] ${bordered ? "border border-border" : ""} ${interactive ? "transition hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-pop)] active:scale-[0.98]" : ""} ${paddingClasses[padding]} ${className}`}
      style={{
        transitionDuration: interactive ? "var(--dur)" : undefined,
        transitionTimingFunction: interactive ? "var(--ease)" : undefined,
        ...style,
      }}
      {...props}
    />
  );
}
