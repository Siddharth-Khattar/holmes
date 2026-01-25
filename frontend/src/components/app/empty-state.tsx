// ABOUTME: Generic empty state component for when no data exists
// ABOUTME: Used for cases list, files list, and other empty collections

import { type LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center py-16 px-4",
        "text-center",
        className,
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-smoke/5 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-stone" />
      </div>
      <h3 className="text-lg font-medium text-smoke mb-2">{title}</h3>
      <p className="text-stone text-sm max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
