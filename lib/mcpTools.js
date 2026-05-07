// Stateless MCP tools. They never read or write user data on the server —
// every tool either runs pure logic or calls an existing Filey edge route
// (chat / extract) on the user's behalf. Filey is offline-first; the user's
// ledger lives in their browser, so MCP clients (Claude, Cursor, etc.) must
// either pass data inline or instruct the user to act in the browser.

export const TOOLS = [
  {
    name: 'validate_trn',
    description: 'Validates a UAE Tax Registration Number (TRN). Returns { ok, msg }.',
    inputSchema: {
      type: 'object',
      properties: { trn: { type: 'string', description: 'UAE TRN (15 digits, must start with 100).' } },
      required: ['trn'],
    },
  },
  {
    name: 'compute_vat',
    description: 'Computes VAT amount given a total in a UAE-style 5% inclusive scheme. Returns { net, vat, total } in the same currency.',
    inputSchema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'VAT-inclusive grand total.' },
        rate: { type: 'number', description: 'VAT rate as a decimal. Defaults to 0.05.', default: 0.05 },
      },
      required: ['total'],
    },
  },
  {
    name: 'compute_vat_quarter',
    description: 'Aggregates a list of transactions into UAE quarterly VAT (output, input, net payable).',
    inputSchema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          description: 'Array of { date, type: "income"|"expense", amount, vat? } objects.',
          items: { type: 'object' },
        },
        quarter: { type: 'string', description: 'YYYY-Q[1-4]. Filters to the quarter if given.' },
      },
      required: ['transactions'],
    },
  },
  {
    name: 'categorize_merchant',
    description: 'Suggests a UAE-friendly category for a merchant string (DEWA → Utilities, Careem → Travel, etc.).',
    inputSchema: {
      type: 'object',
      properties: { merchant: { type: 'string' } },
      required: ['merchant'],
    },
  },
  {
    name: 'parse_receipt_text',
    description: 'Heuristically parses raw OCR text from a UAE receipt into { merchant, total, vat, currency, date }.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'OCR text from a receipt.' } },
      required: ['text'],
    },
  },
  {
    name: 'extract_receipt_image',
    description: 'Sends a base64 receipt image to a vision LLM via Filey\'s /api/extract endpoint. The MCP caller must pass their own provider/apiKey/model — Filey does not store keys.',
    inputSchema: {
      type: 'object',
      properties: {
        imageBase64: { type: 'string', description: 'Base64 image data (no data: prefix).' },
        mediaType:   { type: 'string', description: 'image/png | image/jpeg | image/webp', default: 'image/png' },
        provider:    { type: 'string', description: 'anthropic | openai | google | openai-compat | openrouter | ollama-cloud' },
        apiKey:      { type: 'string', description: 'BYOK key for the chosen provider.' },
        model:       { type: 'string', description: 'Optional model id; defaults sensibly per provider.' },
        baseUrl:     { type: 'string', description: 'Optional override for openai-compat / ollama-cloud.' },
      },
      required: ['imageBase64', 'provider', 'apiKey'],
    },
  },
  {
    name: 'invoice_totals',
    description: 'Computes invoice line totals + VAT + grand total in a given currency.',
    inputSchema: {
      type: 'object',
      properties: {
        items:    { type: 'array', items: { type: 'object' }, description: 'Line items: { qty, rate, vatRate? }.' },
        currency: { type: 'string', default: 'AED' },
        vatRate:  { type: 'number', description: 'Default VAT rate to apply if a line omits its own.', default: 0.05 },
        fxRate:   { type: 'number', description: 'Optional FX rate to AED for the AED-equivalent block.' },
      },
      required: ['items'],
    },
  },
  {
    name: 'format_money',
    description: 'Formats a number with the currency symbol used in Filey (AED/USD/EUR/GBP/SAR/INR).',
    inputSchema: {
      type: 'object',
      properties: { amount: { type: 'number' }, currency: { type: 'string', default: 'AED' } },
      required: ['amount'],
    },
  },
  {
    name: 'health',
    description: 'Liveness check. Returns Filey version + supported tool count.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ─── Implementations ───────────────────────────────────────────────────────

const CURRENCIES = {
  AED: { sym: 'AED', dec: 2 },
  USD: { sym: '$',   dec: 2 },
  EUR: { sym: '€',   dec: 2 },
  GBP: { sym: '£',   dec: 2 },
  SAR: { sym: 'SR',  dec: 2 },
  INR: { sym: '₹',   dec: 2 },
};

function fmtMoney(currency, amount) {
  const m = CURRENCIES[currency] || CURRENCIES.AED;
  const n = Number.isFinite(amount) ? amount : 0;
  return `${m.sym} ${n.toFixed(m.dec)}`;
}

function validateTrn(trn) {
  const clean = String(trn || '').replace(/\s/g, '');
  if (!clean) return { ok: false, msg: 'Empty TRN.' };
  if (!/^\d{15}$/.test(clean)) return { ok: false, msg: 'TRN must be 15 digits.' };
  if (!clean.startsWith('100')) return { ok: false, msg: 'UAE TRN must start with 100.' };
  return { ok: true, msg: 'Valid UAE TRN format.' };
}

function computeVat(total, rate = 0.05) {
  const t = Number(total) || 0;
  const r = Number(rate);
  const net = t / (1 + r);
  return { net: +net.toFixed(2), vat: +(t - net).toFixed(2), total: +t.toFixed(2) };
}

function inQuarter(dateStr, qtag) {
  if (!qtag) return true;
  const m = /^(\d{4})-Q([1-4])$/.exec(qtag); if (!m) return true;
  const y = +m[1], q = +m[2];
  const d = new Date(dateStr); if (isNaN(d)) return false;
  if (d.getUTCFullYear() !== y) return false;
  const month = d.getUTCMonth() + 1;
  const dq = Math.ceil(month / 3);
  return dq === q;
}

function computeVatQuarter({ transactions = [], quarter }) {
  let outputVat = 0, inputVat = 0, income = 0, expense = 0;
  for (const tx of transactions) {
    if (!inQuarter(tx.date, quarter)) continue;
    const vat = Number(tx.vat) || 0;
    const amt = Number(tx.amount) || 0;
    if (String(tx.type).toLowerCase().startsWith('inc')) {
      income += amt; outputVat += vat;
    } else {
      expense += amt; inputVat += vat;
    }
  }
  const net = +(outputVat - inputVat).toFixed(2);
  return {
    quarter: quarter || 'all',
    income: +income.toFixed(2),
    expense: +expense.toFixed(2),
    outputVat: +outputVat.toFixed(2),
    inputVat: +inputVat.toFixed(2),
    netVatPayable: net,
    note: net >= 0 ? 'You owe this VAT to the FTA.' : 'You may reclaim this amount from the FTA.',
  };
}

const CATEGORY_RULES = [
  { re: /\b(dewa|sewa|adwea|fewa|etisalat|du\b|zain|virgin\s*mobile)\b/i, cat: 'Utilities' },
  { re: /\b(careem|uber|talabat|noon\s*food|deliveroo|zomato)\b/i,        cat: 'Food' },
  { re: /\b(etihad|emirates|fly\s*dubai|fz|airport|salik|metro)\b/i,      cat: 'Travel' },
  { re: /\b(adobe|figma|github|notion|chatgpt|openai|anthropic|jetbrains|vercel|cloudflare|linear|slack|google\s*workspace|microsoft|aws|gcp|azure)\b/i, cat: 'Software' },
  { re: /\b(office|wework|astro\s*labs|letswork|coworking|rent|landlord)\b/i, cat: 'Rent' },
  { re: /\b(facebook|meta|instagram|tiktok|linkedin|twitter|x\s+ads|google\s*ads)\b/i, cat: 'Marketing' },
  { re: /\b(carrefour|lulu|spinneys|union\s*coop|waitrose|choithrams|grocer|supermarket)\b/i, cat: 'Supplies' },
];
function categorizeMerchant(merchant) {
  const m = String(merchant || '');
  for (const r of CATEGORY_RULES) if (r.re.test(m)) return { category: r.cat, confidence: 0.9 };
  return { category: 'Other', confidence: 0.2 };
}

function parseReceiptText(text) {
  const t = String(text || '');
  const merchant = (t.split('\n').map(s => s.trim()).find(s => s && /^[A-Za-z]/.test(s)) || '').slice(0, 64);
  const totalMatch = t.match(/(total|grand\s*total|amount\s*due)[^0-9]*([0-9,.]+)/i);
  const vatMatch   = t.match(/(vat|tax)[^0-9]*([0-9,.]+)/i);
  const dateMatch  = t.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  const currencyMatch = t.match(/\b(AED|USD|EUR|GBP|SAR|INR)\b/);
  const total = totalMatch ? Number(totalMatch[2].replace(/,/g, '')) : null;
  const vat   = vatMatch   ? Number(vatMatch[2].replace(/,/g, ''))   : (total ? +(total * 0.05 / 1.05).toFixed(2) : null);
  const date  = dateMatch  ? `${dateMatch[1]}-${String(dateMatch[2]).padStart(2,'0')}-${String(dateMatch[3]).padStart(2,'0')}` : null;
  const currency = currencyMatch ? currencyMatch[1] : 'AED';
  return { merchant, total, vat, currency, date };
}

function invoiceTotals({ items = [], currency = 'AED', vatRate = 0.05, fxRate }) {
  let net = 0, vat = 0;
  for (const it of items) {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate) || 0;
    const lineNet = qty * rate;
    const r = it.vatRate != null ? Number(it.vatRate) : vatRate;
    net += lineNet;
    vat += lineNet * r;
  }
  const total = net + vat;
  const out = {
    currency,
    net: +net.toFixed(2),
    vat: +vat.toFixed(2),
    total: +total.toFixed(2),
    formatted: { net: fmtMoney(currency, net), vat: fmtMoney(currency, vat), total: fmtMoney(currency, total) },
  };
  if (Number.isFinite(fxRate) && currency !== 'AED') {
    const aed = total * Number(fxRate);
    out.aedEquivalent = +aed.toFixed(2);
    out.formatted.aedEquivalent = fmtMoney('AED', aed);
  }
  return out;
}

async function callExtract({ imageBase64, mediaType = 'image/png', provider, apiKey, model, baseUrl }, origin) {
  const url = `${origin}/api/extract`;
  const dataUrl = `data:${mediaType};base64,${imageBase64}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, model, baseUrl, imageDataUrl: dataUrl }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `extract failed (${res.status})`);
  return j;
}

const VERSION = '1.0.0';

export async function runTool(name, args = {}, ctx = {}) {
  switch (name) {
    case 'health':
      return { ok: true, version: VERSION, tools: TOOLS.length };
    case 'validate_trn':
      return validateTrn(args.trn);
    case 'compute_vat':
      return computeVat(args.total, args.rate);
    case 'compute_vat_quarter':
      return computeVatQuarter(args);
    case 'categorize_merchant':
      return categorizeMerchant(args.merchant);
    case 'parse_receipt_text':
      return parseReceiptText(args.text);
    case 'invoice_totals':
      return invoiceTotals(args);
    case 'format_money':
      return { formatted: fmtMoney(args.currency || 'AED', args.amount) };
    case 'extract_receipt_image':
      return await callExtract(args, ctx.origin);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
