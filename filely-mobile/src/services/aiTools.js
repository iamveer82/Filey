/**
 * LLM tool schemas + handlers for agentic chat.
 * Format: OpenAI-style function tools. Adapters translate for Anthropic/Gemini.
 */
import apiClient from '../api/client';
import { summarizeVat, categoryById } from './categories';
import { exportCSV, exportPDF } from './exportLedger';

export const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'save_transaction',
      description: 'Save a parsed receipt to the vault. Use when user confirms extracted fields.',
      parameters: {
        type: 'object',
        properties: {
          merchant: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          amount: { type: 'number', description: 'Total AED' },
          vat: { type: 'number', description: 'VAT AED (5% UAE standard)' },
          trn: { type: 'string', description: 'Optional 15-digit TRN' },
          category: { type: 'string', description: 'One of: fuel, food, groceries, office, utilities, telecom, travel, hotel, software, marketing, legal, medical, bank, other' },
          notes: { type: 'string' },
        },
        required: ['merchant', 'date', 'amount', 'vat', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_vault',
      description: 'Search saved transactions by merchant, category, date range, or amount.',
      parameters: {
        type: 'object',
        properties: {
          merchant: { type: 'string' },
          category: { type: 'string' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          minAmount: { type: 'number' },
          maxAmount: { type: 'number' },
          scope: { type: 'string', enum: ['mine', 'company'], description: 'company = all org receipts' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_vat_summary',
      description: 'Open the VAT summary modal. Use when user asks about totals, reclaimable VAT, or filing.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'YYYY-MM or YYYY-Qn' },
          scope: { type: 'string', enum: ['mine', 'company'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_export',
      description: 'Export the ledger. Use when user asks for CSV/PDF/download/email/FTA submission.',
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'pdf'] },
          scope: { type: 'string', enum: ['mine', 'company'] },
          period: { type: 'string' },
        },
        required: ['format'],
      },
    },
  },
];

/** Convert OpenAI schema to Anthropic tool format. */
export function toAnthropicTools(schemas = TOOL_SCHEMAS) {
  return schemas.map(s => ({
    name: s.function.name,
    description: s.function.description,
    input_schema: s.function.parameters,
  }));
}

/**
 * Run one tool call. Returns { ok, result|error, side? }
 *   side = 'open_vat_summary' | 'save_visible' etc. — UI effects.
 */
export async function runTool(name, args, ctx = {}) {
  try {
    switch (name) {
      case 'save_transaction': {
        const tx = {
          merchant: args.merchant,
          date: args.date,
          amount: Number(args.amount) || 0,
          vat: Number(args.vat) || 0,
          trn: args.trn || '',
          category: args.category || 'other',
          notes: args.notes || '',
          ...(ctx.orgId ? { orgId: ctx.orgId, submittedBy: ctx.userId, submittedByName: ctx.submitterName } : {}),
        };
        const saved = await apiClient.createTransaction(tx);
        return { ok: true, result: { id: saved?.id || saved?._id, ...tx } };
      }

      case 'search_vault': {
        const params = {};
        if (args.merchant) params.merchant = args.merchant;
        if (args.category) params.category = args.category;
        if (args.dateFrom) params.dateFrom = args.dateFrom;
        if (args.dateTo) params.dateTo = args.dateTo;
        if (args.minAmount != null) params.minAmount = args.minAmount;
        if (args.maxAmount != null) params.maxAmount = args.maxAmount;
        const fn = (args.scope === 'company' && ctx.orgId)
          ? apiClient.getOrgTransactions.bind(apiClient, ctx.orgId)
          : apiClient.getTransactions.bind(apiClient);
        const list = await fn(params);
        const rows = (Array.isArray(list) ? list : list?.transactions || []).slice(0, 30);
        const summary = summarizeVat(rows);
        return { ok: true, result: { count: rows.length, totals: summary, sample: rows.slice(0, 8) } };
      }

      case 'show_vat_summary': {
        return { ok: true, result: { opened: true }, side: { type: 'open_vat_summary', scope: args.scope || 'mine', period: args.period } };
      }

      case 'run_export': {
        const fn = (args.scope === 'company' && ctx.orgId)
          ? apiClient.getOrgTransactions.bind(apiClient, ctx.orgId)
          : apiClient.getTransactions.bind(apiClient);
        const list = await fn({});
        const rows = Array.isArray(list) ? list : list?.transactions || [];
        const opts = { period: args.period, company: ctx.companyName };
        if (args.format === 'csv') await exportCSV(rows, opts);
        else await exportPDF(rows, opts);
        return { ok: true, result: { exported: rows.length, format: args.format } };
      }

      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { ok: false, error: e.message || 'Tool failed' };
  }
}

/** Normalize tool calls from any provider into {id, name, args}. */
export function normalizeToolCalls(raw, provider) {
  if (!raw?.length) return [];
  if (provider === 'anthropic') {
    return raw.map(b => ({ id: b.id, name: b.name, args: b.input || {} }));
  }
  // OpenAI/OpenRouter
  return raw.map(c => ({
    id: c.id,
    name: c.function?.name,
    args: safeParse(c.function?.arguments),
  }));
}

function safeParse(s) {
  if (!s) return {};
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch { return {}; }
}
