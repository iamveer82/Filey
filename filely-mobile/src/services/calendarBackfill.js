/**
 * Receipt → calendar backfill.
 * Hotel/flight tx suggest trip dates. Build calendar event suggestion
 * the user can accept to add to their device calendar.
 *
 * Uses expo-calendar when available; degrades to just returning the
 * suggestion object so the caller can render a confirm UI.
 */

let Calendar = null;
function getCalendar() {
  if (Calendar !== null) return Calendar;
  try { Calendar = require('expo-calendar'); } catch { Calendar = false; }
  return Calendar;
}

const TRIP_CATEGORIES = new Set(['hotel', 'travel']);

/**
 * Build an event suggestion from one tx.
 * Hotel: overnight span (date → date+1) with merchant title.
 * Travel: single-day event.
 * Returns null for non-trip categories.
 */
export function buildSuggestion(tx) {
  if (!tx || !TRIP_CATEGORIES.has(tx.category)) return null;
  const base = tx.date ? new Date(tx.date) : new Date();
  if (isNaN(base.getTime())) return null;
  const startDate = new Date(base);
  const endDate = new Date(base);
  if (tx.category === 'hotel') endDate.setDate(endDate.getDate() + 1);
  else endDate.setHours(endDate.getHours() + 2);

  return {
    title: tx.category === 'hotel'
      ? `Stay — ${tx.merchant || 'Hotel'}`
      : `Travel — ${tx.merchant || 'Trip'}`,
    notes: `Linked Filey tx · ${tx.amount || ''} ${tx.currency || 'AED'}`,
    startDate,
    endDate,
    allDay: tx.category === 'hotel',
    txId: tx.id,
  };
}

/** Request permission + return default calendar id, or null if unavailable. */
async function getDefaultCalendarId() {
  const C = getCalendar();
  if (!C) return null;
  const { status } = await C.requestCalendarPermissionsAsync();
  if (status !== 'granted') return null;
  const cals = await C.getCalendarsAsync(C.EntityTypes.EVENT);
  const primary = cals.find(c => c.allowsModifications && c.isPrimary) || cals.find(c => c.allowsModifications);
  return primary?.id || null;
}

export async function addSuggestionToCalendar(suggestion) {
  const C = getCalendar();
  if (!C || !suggestion) return { ok: false, reason: 'calendar unavailable' };
  const calId = await getDefaultCalendarId();
  if (!calId) return { ok: false, reason: 'no calendar permission' };
  const eventId = await C.createEventAsync(calId, {
    title: suggestion.title,
    notes: suggestion.notes,
    startDate: suggestion.startDate,
    endDate: suggestion.endDate,
    allDay: !!suggestion.allDay,
  });
  return { ok: true, eventId };
}
