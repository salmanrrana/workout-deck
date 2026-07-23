import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  KeyboardEventHandler,
  MouseEventHandler,
} from "react";

type CardVisualProps = {
  bordered?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
};

type NativeInteractiveTag = "a" | "button";
type StaticCardTag =
  | "div"
  | "article"
  | "section"
  | "aside"
  | "header"
  | "footer"
  | "main"
  | "nav"
  | "figure"
  | "figcaption"
  | "ul"
  | "ol"
  | "li";
type CardTag = StaticCardTag | NativeInteractiveTag;

type OmitCardKeys =
  | keyof CardVisualProps
  | "as"
  | "interactive"
  | "onClick"
  | "onKeyDown"
  | "role"
  | "tabIndex"
  | "style";

/** Non-interactive surface — no activation semantics. */
export type CardStaticProps<T extends StaticCardTag = "div"> = CardVisualProps & {
  as?: T;
  interactive?: false;
  onClick?: never;
} & Omit<ComponentPropsWithoutRef<T>, OmitCardKeys>;

/**
 * Clickable non-native host. `interactive` and `onClick` are required together so
 * the card always receives keyboard activation + the F1 focus ring.
 */
export type CardActionProps<T extends StaticCardTag = "div"> = CardVisualProps & {
  as?: T;
  interactive: true;
  onClick: MouseEventHandler<HTMLElement>;
} & Omit<ComponentPropsWithoutRef<T>, OmitCardKeys>;

/**
 * Visually interactive host that is already keyboard-accessible (`a` / `button`).
 */
export type CardNativeInteractiveProps<T extends NativeInteractiveTag> = CardVisualProps & {
  as: T;
  interactive: true;
  onClick?: ComponentPropsWithoutRef<T>["onClick"];
} & Omit<ComponentPropsWithoutRef<T>, OmitCardKeys> &
  (T extends "a"
    ? { href: NonNullable<ComponentPropsWithoutRef<"a">["href"]> }
    : Record<never, never>);

export type CardProps<T extends CardTag = "div"> = T extends NativeInteractiveTag
  ? CardNativeInteractiveProps<T>
  : T extends StaticCardTag
    ? CardStaticProps<T> | CardActionProps<T>
    : never;

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

/** Elements that already expose native keyboard activation + focus. */
const NATIVE_INTERACTIVE = new Set<string>(["a", "button"]);

type CardRuntimeProps = CardVisualProps & {
  as?: ElementType;
  interactive?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  role?: string;
  tabIndex?: number;
  style?: CSSProperties;
};

export function Card<T extends CardTag = "div">(props: CardProps<T>) {
  const {
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
    ...rest
  } = props as CardRuntimeProps;

  const Component = (as ?? "div") as ElementType;
  const nativelyInteractive =
    typeof Component === "string" && NATIVE_INTERACTIVE.has(Component);
  // Tie keyboard semantics to actual activation (onClick), not the visual `interactive` flag alone.
  const needsActivationShim =
    typeof onClick === "function" &&
    typeof Component === "string" &&
    !nativelyInteractive;

  const handleKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !needsActivationShim) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <Component
      className={`rounded-lg bg-surface-1 [box-shadow:var(--shadow-card)] ${bordered ? "border border-border" : ""} ${interactive ? "cursor-pointer active:brightness-[0.96] motion-safe:transition motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:[box-shadow:var(--shadow-pop)] motion-safe:active:scale-[0.98]" : ""} ${paddingClasses[padding]} ${className}`}
      style={style}
      onClick={onClick}
      onKeyDown={needsActivationShim || onKeyDown ? handleKeyDown : undefined}
      role={needsActivationShim ? (role ?? "button") : role}
      tabIndex={needsActivationShim ? (tabIndex ?? 0) : tabIndex}
      {...rest}
    />
  );
}
