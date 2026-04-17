/**
 * AI smarts:
 *  - suggestFollowups(text, history) → 2-3 tappable next questions
 *  - detectAnomaly(tx, memberHistory) → flag unusual merchant / 3σ spike
 *  - buildWeeklyDigest(transactions) → formatted system-message body
 */
import { send as llmSend } from './llmProvider';
import { summarizeVat, categoryById } from './categories';

/**
 * Generate followup suggestions. Tries LLM with tight prompt; falls back to
 * heuristic chips for offline/gemma.
 */
export async function suggestFollowups(assistantText, userText, { provider, signal } = {}) {
  const offlineChips = () => {
    const chips = [];
    if (/vat|tax|reclaim/i.test(assistantText + userText)) chips.push('Am I claiming all reclaimable VAT?');
    if (/fuel|enoc|adnoc/i.test(assistantText + userText)) chips.push('Show fuel spend trend');
    if (/hotel|travel/i.test(assistantText + userText)) chips.push('Which trips are missing receipts?');
    if (/food|dining|meal/i.test(assistantText + userText)) chips.push('Break down food by merchant');
    if (chips.length < 2) chips.push('Summarize this month', 'Export Q1 ledger', 'Top 5 merchants');
    return chips.slice(0, 3);
  };

  if (!provider || provider === 'gemma') return offlineChips();

  try {
    const sys = {
      role: 'system',
      content: 'Return exactly 3 short followup questions a UAE VAT user might tap next. Each ≤60 chars, imperative or question form. Output ONLY a JSON array of strings, nothing else.',
    };
    const out = await llmSend([sys, { role: 'user', content: `Last question: ${userText}\nAssistant answered: ${assistantText.slice(0, 400)}\nSuggest 3 followups as JSON array.` }], {
      provider, maxTokens: 150, signal,
    });
    const m = String(out.text).match(/\[[\s\S]*?\]/);
    if (m) {
      const arr = JSON.parse(m[0]);
      if (Array.isArray(arr) && arr.length) return arr.slice(0, 3).map(String);
    }
  } catch {}
  return offlineChips();
}

/**
 * detectAnomaly: flag tx deviating from member's norm.
 * Returns { anomaly: bool, reasons: [], severity }.
 */
export function detectAnomaly(tx, memberHistory = []) {
  const reasons = [];
  if (!tx) return { anomaly: false, reasons };

  const sameCat = memberHistory.filter(h => h.category === tx.category);
  const sameMerchant = memberHistory.filter(
    h => normalize(h.merchant) === normalize(tx.merchant)
  );

  if (sameMerchant.length === 0 && memberHistory.length >= 5) {
    reasons.push(`new merchant: ${tx.merchant}`);
  }

  if (sameCat.length >= 5) {
    const amts = sameCat.map(h => parseFloat(h.amount) || 0);
    const mean = amts.reduce((a, b) => a + b, 0) / amts.length;
    const variance = amts.reduce((a, b) => a + (b - mean) ** 2, 0) / amts.length;
    const sd = Math.sqrt(variance);
    const amt = parseFloat(tx.amount) || 0;
    if (sd > 0 && amt > mean + 3 * sd) {
      reasons.push(`${amt.toFixed(0)} AED is ${((amt - mean) / sd).toFixed(1)}σ above your ${categoryById(tx.category).label} mean (${mean.toFixed(0)})`);
    }
    if (sd > 0 && amt > mean * 2 && amt - mean > 200) {
      // looser fallback if 3σ not triggered
      if (!reasons.find(r => r.includes('σ'))) {
        reasons.push(`${amt.toFixed(0)} AED is ${(amt / mean).toFixed(1)}× your avg ${categoryById(tx.category).label}`);
      }
    }
  }

  const severity = reasons.length === 0 ? 'none' : reasons.some(r => /σ|new/.test(r)) ? 'warn' : 'info';
  return { anomaly: reasons.length > 0, reasons, severity };
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Weekly digest: top merchants, tax-saving hints, TRN gap receipts.
 * Returns string (markdown) + stats object.
 */
export function buildWeeklyDigest(transactions = []) {
  const now = Date.now();
  const week = transactions.filter(t => {
    const d = new Date(t.date || t.createdAt || 0).getTime();
    return now - d < 8 * 86400000;
  });
  if (week.length === 0) {
    return { text: 'No receipts scanned this week. Snap any pending ones to stay on top of VAT filings.', stats: { count: 0 } };
  }

  const sum = summarizeVat(week);
  const byMerchant = {};
  for (const t of week) {
    const m = t.merchant || 'Unknown';
    byMerchant[m] = (byMerchant[m] || { amt: 0, count: 0, vat: 0 });
    byMerchant[m].amt += parseFloat(t.amount) || 0;
    byMerchant[m].vat += parseFloat(t.vat) || 0;
    byMerchant[m].count++;
  }
  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1].amt - a[1].amt)
    .slice(0, 3)
    .map(([m, s]) => `- **${m}**: ${s.amt.toFixed(2)} AED · ×${s.count}`)
    .join('\n');

  const missingTrn = week.filter(t => !t.trn && parseFloat(t.amount) >= 100);
  const reclaimableLeft = sum.reclaimable.toFixed(2);

  const parts = [
    `### 📊 Weekly digest`,
    `**${week.length} receipts · ${sum.totalAmt.toFixed(2)} AED · VAT ${sum.totalVat.toFixed(2)}**`,
    ``,
    `**Top merchants**`,
    topMerchants,
  ];
  if (parseFloat(reclaimableLeft) > 0) {
    parts.push('', `💰 **${reclaimableLeft} AED reclaimable** across business categories.`);
  }
  if (missingTrn.length) {
    parts.push('', `⚠ ${missingTrn.length} receipt${missingTrn.length > 1 ? 's' : ''} over 100 AED missing TRN — add them to stay FTA compliant.`);
  }
  return {
    text: parts.join('\n'),
    stats: { count: week.length, total: sum.totalAmt, vat: sum.totalVat, reclaimable: sum.reclaimable, missingTrn: missingTrn.length },
  };
}
