'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * FormField — wraps an input with label, helper text, error, and optional
 * inline icon. Pass any input element as `children`.
 *
 *   <FormField label="TRN" hint="15-digit UAE Tax Registration Number" error={trn.error}>
 *     <Input value={trn.value} onChange={...} />
 *   </FormField>
 */
export function FormField({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
  trailing,   // optional element rendered to the right of the label row
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || trailing) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {label}
              {required && <span className="ml-0.5 text-danger">*</span>}
            </label>
          )}
          {trailing && <div className="text-2xs text-fg-subtle">{trailing}</div>}
        </div>
      )}
      <div>{children}</div>
      {error ? (
        <div className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
