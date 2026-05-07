'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Chip — compact, optionally-removable pill. Use for filter tags, attachment
 * previews, custom-field key/values, applied facets. Smaller and more
 * functional than Badge.
 *
 *   <Chip>Utilities</Chip>
 *   <Chip tone="brand" onRemove={...}>Q1 2026</Chip>
 *   <Chip tone="success" leadingIcon={Check}>Synced</Chip>
 */
const chipStyles = cva(
  'inline-flex items-center gap-1.5 rounded-full border text-xs font-medium transition',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-bg-muted text-fg',
        brand:   'border-brand/20 bg-brand-soft text-brand',
        success: 'border-success/20 bg-success-soft text-success',
        warning: 'border-warning/30 bg-warning-soft text-warning',
        danger:  'border-danger/20 bg-danger-soft text-danger',
        info:    'border-info/20 bg-info-soft text-info',
        outline: 'border-border bg-transparent text-fg-muted',
      },
      size: {
        sm: 'h-5 px-2 text-[10px]',
        md: 'h-6 px-2.5',
        lg: 'h-7 px-3',
      },
      interactive: {
        true: 'cursor-pointer hover:bg-bg-elevated',
        false: '',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md', interactive: false },
  }
);

export function Chip({
  tone = 'neutral',
  size = 'md',
  onRemove,
  onClick,
  leadingIcon: Lead,
  className,
  children,
  ...rest
}) {
  const interactive = !!onClick;
  return (
    <span
      onClick={onClick}
      className={cn(chipStyles({ tone, size, interactive }), className)}
      {...rest}
    >
      {Lead && <Lead className="h-3 w-3" />}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remove"
          className="-mr-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-current/70 transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
