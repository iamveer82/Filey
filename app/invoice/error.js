'use client';
import RouteError from '@/components/dashboard/RouteError';
export default function Error({ error, reset }) {
  return <RouteError error={error} reset={reset} scope="the Invoice builder" />;
}
