'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Spinner — lightweight loading indicator. SVG only, no animation library.
 * Sizes: sm (14), md (18), lg (24), xl (32).
 */
const SIZE = { sm: 14, md: 18, lg: 24, xl: 32 };

export function Spinner({ size = 'md', tone = 'current', className, label = 'Loading' }) {
  const px = SIZE[size] || SIZE.md;
  const stroke = tone === 'brand' ? 'text-brand'
                : tone === 'fg'    ? 'text-fg'
                : tone === 'subtle'? 'text-fg-subtle'
                                   : '';
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center justify-center', stroke, className)}>
      <svg width={px} height={px} viewBox="0 0 24 24" className="animate-spin" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
