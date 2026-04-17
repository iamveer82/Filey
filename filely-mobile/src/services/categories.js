/**
 * UAE VAT category taxonomy + auto-categorization.
 * Aligned with FTA expense categories. Keyword fallback when no LLM key.
 */
import { send as llmSend } from './llmProvider';

export const CATEGORIES = [
  { id: 'fuel',       label: 'Fuel & Vehicle',     icon: 'car',               color: '#F59E0B', vatReclaim: true,  keywords: ['enoc', 'adnoc', 'emarat', 'petrol', 'fuel', 'diesel', 'shell', 'caltex'] },
  { id: 'food',       label: 'Food & Dining',      icon: 'restaurant',        color: '#F97316', vatReclaim: false, keywords: ['restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'mcdonalds', 'kfc', 'starbucks'] },
  { id: 'groceries',  label: 'Groceries',          icon: 'basket',            color: '#10B981', vatReclaim: false, keywords: ['carrefour', 'lulu', 'spinneys', 'choithrams', 'grocery', 'supermarket'] },
  { id: 'office',     label: 'Office Supplies',    icon: 'briefcase',         color: '#3B6BFF', vatReclaim: true,  keywords: ['stationery', 'printer', 'paper', 'office', 'ikea', 'desk', 'chair'] },
  { id: 'utilities',  label: 'Utilities',          icon: 'flash',             color: '#EAB308', vatReclaim: true,  keywords: ['dewa', 'sewa', 'addc', 'fewa', 'electric', 'water', 'utility'] },
  { id: 'telecom',    label: 'Telecom & Internet', icon: 'wifi',              color: '#06B6D4', vatReclaim: true,  keywords: ['du', 'etisalat', 'telecom', 'internet', 'phone', 'mobile plan'] },
  { id: 'travel',     label: 'Travel & Transport', icon: 'airplane',          color: '#8B5CF6', vatReclaim: true,  keywords: ['emirates', 'flydubai', 'etihad', 'uber', 'careem', 'taxi', 'flight', 'metro', 'rta'] },
  { id: 'hotel',      label: 'Accommodation',      icon: 'bed',               color: '#EC4899', vatReclaim: true,  keywords: ['hotel', 'booking', 'airbnb', 'hilton', 'marriott', 'rotana'] },
  { id: 'software',   label: 'Software & SaaS',    icon: 'code-slash',        color: '#6366F1', vatReclaim: true,  keywords: ['microsoft', 'adobe', 'google', 'aws', 'github', 'zoho', 'slack', 'subscription'] },
  { id: 'marketing',  label: 'Marketing & Ads',    icon: 'megaphone',         color: '#F43F5E', vatReclaim: true,  keywords: ['google ads', 'meta ads', 'facebook ads', 'linkedin ads', 'marketing'] },
  { id: 'legal',      label: 'Legal & Professional', icon: 'shield-checkmark', color: '#0EA5E9', vatReclaim: true,  keywords: ['legal', 'lawyer', 'consultant', 'accountant', 'audit'] },
  { id: 'medical',    label: 'Medical',            icon: 'medkit',            color: '#EF4444', vatReclaim: false, keywords: ['pharmacy', 'hospital', 'clinic', 'doctor', 'medical', 'dental'] },
  { id: 'bank',       label: 'Bank & Fees',        icon: 'card',              color: '#64748B', vatReclaim: false, keywords: ['bank fee', 'charge', 'transfer fee', 'commission'] },
  { id: 'other',      label: 'Other',              icon: 'ellipsis-horizontal', color: '#94A3B8', vatReclaim: false, keywords: [] },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

export function categoryById(id) {
  return CATEGORY_MAP[id] || CATEGORY_MAP.other;
}

/**
 * Fast keyword-based categorization. Runs offline, no API call.
 */
export function categorizeByKeywords(merchant, notes = '') {
  const hay = `${merchant || ''} ${notes || ''}`.toLowerCase();
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      if (hay.includes(kw)) return cat.id;
    }
  }
  return 'other';
}

/**
 * Auto-categorize via LLM when a provider is configured.
 * Falls back to keyword matching on any error.
 */
export async function autoCategorize({ merchant, amount, notes, ocrText }) {
  const fast = categorizeByKeywords(merchant, notes || ocrText);
  if (fast !== 'other') return { id: fast, source: 'keyword' };

  try {
    const list = CATEGORIES.map(c => `${c.id}: ${c.label}`).join('\n');
    const out = await llmSend([
      { role: 'system', content: `You classify UAE business expenses. Reply with ONLY the category id from this list, nothing else.\n${list}` },
      { role: 'user', content: `Merchant: ${merchant || 'unknown'}\nAmount: ${amount || 'n/a'} AED\nNotes: ${notes || ocrText || 'n/a'}\n\nCategory id:` },
    ], { maxTokens: 20 });
    const raw = (out.text || '').trim().toLowerCase().split(/\s|,|\n/)[0];
    if (CATEGORY_MAP[raw]) return { id: raw, source: 'llm' };
  } catch {}
  return { id: fast, source: 'keyword' };
}

/**
 * VAT 5% split — inputs (reclaimable) vs outputs (expenses to customer).
 */
export function summarizeVat(transactions) {
  // Lazy import to avoid circular
  const { reclaimableVat } = require('./vatRules');
  let totalAmt = 0, totalVat = 0, reclaimable = 0;
  const byCategory = {};
  for (const t of transactions) {
    const amt = parseFloat(t.amount) || 0;
    const vat = parseFloat(t.vat) || 0;
    totalAmt += amt;
    totalVat += vat;
    const r = reclaimableVat(t);
    reclaimable += r;
    const cat = categoryById(t.category);
    byCategory[cat.id] = byCategory[cat.id] || { id: cat.id, label: cat.label, color: cat.color, amt: 0, vat: 0, reclaim: 0, count: 0 };
    byCategory[cat.id].amt += amt;
    byCategory[cat.id].vat += vat;
    byCategory[cat.id].reclaim += r;
    byCategory[cat.id].count += 1;
  }
  return {
    totalAmt, totalVat, reclaimable,
    nonReclaimable: +(totalVat - reclaimable).toFixed(2),
    byCategory: Object.values(byCategory).sort((a, b) => b.amt - a.amt),
    count: transactions.length,
  };
}
