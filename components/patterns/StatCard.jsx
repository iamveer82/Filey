'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FADE_UP, stagger } from '@/lib/design/motion';

/**
 * StatCard — KPI tile used across the dashboard.
 *
 *   <StatCard
 *     icon={Wallet}
 *     label="Total Balance"
 *     value="AED 365,500"
 *     delta="+12%"
 *     trend="up"
 *     sub="+AED 42,300 from last month"
 *     href="/transactions"
 *     index={0}
 *   />
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  trend = 'up',     // 'up' | 'down' | 'flat'
  sub,
  href,
  className,
  index = 0,
  tone = 'brand',   // 'brand' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;
  const trendCls  = trend === 'down' ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success';
  const iconBg = {
    brand:   'bg-brand-soft text-brand',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger:  'bg-danger-soft text-danger',
    info:    'bg-info-soft text-info',
  }[tone] || 'bg-brand-soft text-brand';

  return (
    <motion.div
      {...FADE_UP}
      transition={stagger(index)}
      className={cn(
        'card-hover rounded-2xl border border-border bg-bg-elevated p-5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', iconBg)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="text-xs font-medium text-fg-subtle">{label}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-bold text-fg">{value}</span>
              {delta && (
                <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-2xs font-bold', trendCls)}>
                  <TrendIcon className="h-3 w-3" />
                  {delta}
                </span>
              )}
            </div>
          </div>
        </div>
        {href && (
          <Link
            href={href}
            aria-label={`Open ${label}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-muted text-fg-subtle transition hover:bg-border hover:text-fg"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {sub && <p className="mt-3 text-xs text-fg-subtle">{sub}</p>}
    </motion.div>
  );
}
