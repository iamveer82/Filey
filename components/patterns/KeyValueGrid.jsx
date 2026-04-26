'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * KeyValueGrid — definition-list style display for receipts, invoice
 * preview, summary blocks. Pass either `items={[{label,value}]}` or render
 * `<KeyValueGrid.Row label value />` children directly.
 */
export function KeyValueGrid({ items, columns = 2, dense = false, className, children }) {
  const cols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columns] || 'grid-cols-2';
  return (
    <dl className={cn('grid gap-x-6', cols, dense ? 'gap-y-2' : 'gap-y-3', className)}>
      {items
        ? items.map((it, i) => <Row key={i} label={it.label} value={it.value} mono={it.mono} tone={it.tone} dense={dense} />)
        : children}
    </dl>
  );
}

function Row({ label, value, mono, tone, dense }) {
  const valueTone = {
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-danger',
    brand:   'text-brand',
    muted:   'text-fg-muted',
  }[tone] || 'text-fg';
  return (
    <div className={cn('flex items-baseline justify-between gap-3', dense ? 'border-b border-border/60 pb-1.5' : 'border-b border-border pb-2')}>
      <dt className="text-xs font-medium text-fg-subtle">{label}</dt>
      <dd className={cn('text-sm font-semibold tabular-nums', valueTone, mono && 'font-mono')}>{value}</dd>
    </div>
  );
}

KeyValueGrid.Row = Row;
