import type { ReactNode } from "react";
import { Card, type CardStaticProps } from "./Card";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
} & Omit<CardStaticProps<"div">, "as" | "bordered" | "children" | "interactive" | "onClick" | "padding">;

export function EmptyState({
  action,
  className = "",
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <Card bordered className={`flex flex-col items-center px-6 py-10 text-center ${className}`} {...props}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-accent" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="text-h3 font-semibold text-text">{title}</h2>
      {description && <p className="mt-2 max-w-prose text-body text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
