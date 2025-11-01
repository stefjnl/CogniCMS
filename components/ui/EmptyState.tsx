"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
      {icon && <div className="mb-4 text-6xl opacity-50">{icon}</div>}
      <h3 className="mb-2 text-xl font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mb-6 max-w-md text-sm text-slate-600">{description}</p>
      )}
      {children && <div className="mb-6">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
