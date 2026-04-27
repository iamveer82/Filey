'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageHeader — consistent top-of-page block with title, subtitle, breadcrumb,
 * and right-aligned action slot.
 *
 *   <PageHeader
 *     title="Transactions"
 *     subtitle="Your full UAE ledger — searchable, filterable, exportable."
 *     actions={<><Button variant="ghost">Import</Button><Button variant="brand">+ Add</Button></>}
 *     breadcrumb={[{label:'Dashboard', href:'/'}, {label:'Transactions'}]}
 *   />
 */
export function PageHeader({ title, subtitle, eyebrow, actions, breadcrumb, className }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-fg-subtle">
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                {b.href ? (
                  <a href={b.href} className="hover:text-fg">{b.label}</a>
                ) : (
                  <span className="text-fg">{b.label}</span>
                )}
                {i < breadcrumb.length - 1 && <span className="text-fg-disabled">/</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        {eyebrow && (
          <div className="mb-1 text-2xs font-bold uppercase tracking-wider text-brand">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * SectionHead — smaller header for sections inside a page (cards, panels).
 *
 *   <SectionHead icon={Receipt} title="Recent transactions" hint="Last 7 days" actions={<Button size="sm">View all</Button>} />
 */
export function SectionHead({ icon: Icon, title, hint, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
