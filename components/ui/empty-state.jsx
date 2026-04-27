'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * EmptyState — used when a list/table/page has no content yet.
 *
 *   <EmptyState
 *     icon={Receipt}
 *     title="No transactions yet"
 *     description="Scan a receipt or import a CSV to get started."
 *     action={<Button variant="brand">Scan receipt</Button>}
 *     secondary={<Button variant="ghost">Import CSV</Button>}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  className,
  illustration,
  density = 'default',
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-bg-subtle text-center',
        density === 'compact' ? 'px-6 py-10' : 'px-8 py-16',
        className
      )}
    >
      {illustration ? (
        <div className="mb-1">{illustration}</div>
      ) : Icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon className="h-7 w-7" />
        </div>
      ) : null}
      {title && <h3 className="text-lg font-semibold text-fg">{title}</h3>}
      {description && <p className="max-w-md text-sm text-fg-muted">{description}</p>}
      {(action || secondary) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
