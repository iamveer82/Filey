'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects first-time visitors to /welcome (marketing landing).
 * Subsequent visits render the dashboard normally.
 *
 * A visit is remembered via `filey.web.seenWelcome` — set either by the
 * welcome page itself or the first time the user dismisses this gate.
 */
export default function FirstVisitGate({ children }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = localStorage.getItem('filey.web.seenWelcome');
      if (!seen) {
        router.replace('/welcome');
        return;
      }
    } catch {}
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>
    );
  }
  return children;
}
