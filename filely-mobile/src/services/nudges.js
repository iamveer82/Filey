/**
 * Proactive nudges — check on app open:
 *  - days since last receipt scan
 *  - UAE VAT filing window (quarterly: 28 days after Q end)
 * Fires in-app alert banner; no push notification (keeps free tier lean).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const LAST_NUDGE_KEY = '@filey/last_nudge_v1';
const NUDGE_COOLDOWN = 20 * 60 * 60 * 1000; // 20h

/** UAE VAT quarters end Mar/Jun/Sep/Dec. Filing due 28 days after quarter end. */
function filingWindow(now = new Date()) {
  const year = now.getFullYear();
  const qEnds = [
    new Date(year, 2, 31),
    new Date(year, 5, 30),
    new Date(year, 8, 30),
    new Date(year, 11, 31),
  ];
  for (const qEnd of qEnds) {
    const due = new Date(qEnd); due.setDate(due.getDate() + 28);
    if (now <= due) {
      const daysToEnd = Math.ceil((qEnd - now) / 86400000);
      const daysToDue = Math.ceil((due - now) / 86400000);
      return { quarterEnd: qEnd, due, daysToEnd, daysToDue };
    }
  }
  return null;
}

/**
 * Compute nudges to show. Returns array of {id, text, severity}.
 * severity: 'info' | 'warn' | 'urgent'
 */
export async function computeNudges({ orgId } = {}) {
  const out = [];

  try {
    const last = await AsyncStorage.getItem(LAST_NUDGE_KEY);
    if (last && Date.now() - parseInt(last, 10) < NUDGE_COOLDOWN) return [];
  } catch {}

  try {
    const res = await (orgId ? apiClient.getOrgTransactions(orgId, {}) : apiClient.getTransactions({}));
    const rows = Array.isArray(res) ? res : res?.transactions || [];
    if (rows.length === 0) {
      out.push({ id: 'empty_vault', text: 'No receipts yet. Scan your first to start building your VAT ledger.', severity: 'info' });
    } else {
      const latest = rows.reduce((max, r) => {
        const d = new Date(r.createdAt || r.date || 0).getTime();
        return d > max ? d : max;
      }, 0);
      const days = Math.floor((Date.now() - latest) / 86400000);
      if (days >= 7 && days < 14) {
        out.push({ id: 'stale_7d', text: `${days} days since last scan. Stay on top of VAT — snap any open receipts now.`, severity: 'info' });
      } else if (days >= 14) {
        out.push({ id: 'stale_14d', text: `${days} days since last scan. Receipts fade — scan before ink dies.`, severity: 'warn' });
      }
    }
  } catch {}

  const fw = filingWindow();
  if (fw) {
    if (fw.daysToEnd > 0 && fw.daysToEnd <= 7) {
      out.push({
        id: `q_end_${fw.daysToEnd}`,
        text: `VAT quarter ends in ${fw.daysToEnd} day${fw.daysToEnd === 1 ? '' : 's'}. Filing window opens after.`,
        severity: 'info',
      });
    } else if (fw.daysToEnd <= 0 && fw.daysToDue > 0 && fw.daysToDue <= 14) {
      out.push({
        id: `filing_${fw.daysToDue}`,
        text: `VAT return due in ${fw.daysToDue} day${fw.daysToDue === 1 ? '' : 's'}. Export your ledger + file on FTA portal.`,
        severity: fw.daysToDue <= 3 ? 'urgent' : 'warn',
      });
    }
  }

  if (out.length) {
    AsyncStorage.setItem(LAST_NUDGE_KEY, String(Date.now())).catch(() => {});
  }
  return out;
}

export async function dismissNudges() {
  await AsyncStorage.setItem(LAST_NUDGE_KEY, String(Date.now())).catch(() => {});
}
