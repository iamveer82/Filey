'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BannerAlert — full-width status strip with icon, title, optional description,
 * action, and dismiss control.
 *
 *   <BannerAlert tone="success" title="Saved" description="Your changes are live." />
 *   <BannerAlert tone="warning" title="API key missing" action={<Button>Open Settings</Button>} dismissible />
 *
 * Tones: info | success | warning | danger
 */
const styles = cva(
  'flex w-full items-start gap-3 rounded-xl border p-4',
  {
    variants: {
      tone: {
        info:    'border-info/20    bg-info-soft    text-fg',
        success: 'border-success/20 bg-success-soft text-fg',
        warning: 'border-warning/30 bg-warning-soft text-fg',
        danger:  'border-danger/20  bg-danger-soft  text-fg',
        neutral: 'border-border     bg-bg-muted     text-fg',
      },
      density: { default: 'p-4', compact: 'p-3' },
    },
    defaultVariants: { tone: 'info', density: 'default' },
  }
);

const ICONS = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger:  XCircle,
  neutral: Info,
};

const ICON_COLOR = {
  info:    'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger:  'text-danger',
  neutral: 'text-fg-subtle',
};

export function BannerAlert({
  tone = 'info',
  title,
  description,
  action,
  dismissible = false,
  onDismiss,
  density = 'default',
  className,
  icon: IconOverride,
  children,
}) {
  const [open, setOpen] = React.useState(true);
  if (!open) return null;
  const Icon = IconOverride || ICONS[tone] || Info;
  return (
    <div role="status" className={cn(styles({ tone, density }), className)}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ICON_COLOR[tone])} />
      <div className="min-w-0 flex-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="mt-0.5 text-xs text-fg-muted">{description}</div>}
        {children && <div className="mt-1.5 text-sm">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {dismissible && (
        <button
          type="button"
          onClick={() => { setOpen(false); onDismiss?.(); }}
          aria-label="Dismiss"
          className="-m-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
