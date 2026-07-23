import type {
  ComponentPropsWithoutRef,
  ElementType,
  KeyboardEventHandler,
} from "react";

type CardOwnProps = {
  bordered?: boolean;
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
};

export type CardProps<T extends ElementType = "div"> = CardOwnProps & {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps | "as">;

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

/** Elements that already expose native keyboard activation + focus. */
const NATIVE_INTERACTIVE = new Set(["a", "button"]);

export function Card<T extends ElementType = "div">({
  as,
  bordered = false,
  className = "",
  interactive = false,
  padding = "md",
  style,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ...props
}: CardProps<T>) {
  const Component = (as ?? "div") as ElementType;
  const nativelyInteractive =
    typeof Component === "string" && NATIVE_INTERACTIVE.has(Component);
  // Non-native hosts (default div, section, etc.) need an a11y shim when interactive.
  // Custom components (e.g. Next.js Link) are assumed to render a native interactive host.
  const needsActivationShim =
    interactive && typeof Component === "string" && !nativelyInteractive;

  const handleKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    (onKeyDown as KeyboardEventHandler<HTMLElement> | undefined)?.(event);
    if (event.defaultPrevented || !needsActivationShim || !onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <Component
      className={`rounded-lg bg-surface-1 [box-shadow:var(--shadow-card)] ${bordered ? "border border-border" : ""} ${interactive ? "cursor-pointer transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:[box-shadow:var(--shadow-pop)] motion-safe:active:scale-[0.98]" : ""} ${paddingClasses[padding]} ${className}`}
      style={{
        transitionDuration: interactive ? "var(--dur)" : undefined,
        transitionTimingFunction: interactive ? "var(--ease)" : undefined,
        ...style,
      }}
      onClick={onClick}
      onKeyDown={needsActivationShim || onKeyDown ? handleKeyDown : undefined}
      role={needsActivationShim ? (role ?? "button") : role}
      tabIndex={needsActivationShim ? (tabIndex ?? 0) : tabIndex}
      {...props}
    />
  );
}
