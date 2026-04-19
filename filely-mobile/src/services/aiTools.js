/**
 * LLM tool schemas + handlers for agentic chat.
 * Format: OpenAI-style function tools. Adapters translate for Anthropic/Gemini.
 */
import apiClient from '../api/client';
import { summarizeVat, categoryById, CATEGORIES } from './categories';
import { exportCSV, exportPDF } from './exportLedger';
import { searchVault as smartSearch } from './smartSearch';
import { listProjects, addProject, groupByProject } from './projects';
import { getDeputy, setDeputy, clearDeputy } from './delegation';
import { getMyCode, getPremiumStatus } from './referral';
import { createShareLink } from './publicShare';
import { getVersions } from './txVersioning';
import { detectAnomaly, suggestFollowups } from './aiInsights';
import { computeNudges } from './nudges';
import { reclaimableVat, splitReclaim } from './vatRules';
import { exportPeppolBatch } from './eInvoiceExport';

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
          format: { type: 'string', enum: ['csv', 'pdf', 'peppol'] },
          scope: { type: 'string', enum: ['mine', 'company'] },
          period: { type: 'string' },
        },
        required: ['format'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'smart_search',
      description: 'Natural-language search across saved receipts (fuzzy merchant/category/notes/date).',
      parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_projects',
      description: 'List active projects/clients for bill-back tagging.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_project',
      description: 'Create a new project/client.',
      parameters: { type: 'object', properties: { name: { type: 'string' }, client: { type: 'string' } }, required: ['name'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'project_breakdown',
      description: 'Group all transactions by project with totals + reclaimable VAT.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_deputy',
      description: 'Read current out-of-office deputy for a manager.',
      parameters: { type: 'object', properties: { managerId: { type: 'string' } }, required: ['managerId'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_deputy',
      description: 'Assign a deputy approver during leave date range.',
      parameters: {
        type: 'object',
        properties: {
          managerId: { type: 'string' },
          deputyId: { type: 'string' }, deputyName: { type: 'string' },
          start: { type: 'string', description: 'YYYY-MM-DD' },
          end: { type: 'string', description: 'YYYY-MM-DD' },
          note: { type: 'string' },
        },
        required: ['managerId', 'deputyId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clear_deputy',
      description: 'Remove a deputy assignment.',
      parameters: { type: 'object', properties: { managerId: { type: 'string' } }, required: ['managerId'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_referral',
      description: 'Return user referral code + premium status.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_share_link',
      description: 'Generate a signed read-only ledger share URL for accountant.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string' }, to: { type: 'string' },
          ttlDays: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tx_versions',
      description: 'Audit trail for a transaction (OCR snapshot + edit diffs).',
      parameters: { type: 'object', properties: { txId: { type: 'string' } }, required: ['txId'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detect_anomalies',
      description: 'Flag unusual spending vs history (3σ + zero-variance fallback).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_followups',
      description: 'Suggested next questions based on recent receipts.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_nudges',
      description: 'Compute actionable nudges (missing TRN, near-cap, duplicate risk).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reclaim_split',
      description: 'Break reclaimable VAT by category (FTA partial-reclaim rules).',
      parameters: { type: 'object', properties: { period: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_categories',
      description: 'List all expense categories with FTA reclaim percentages.',
      parameters: { type: 'object', properties: {} },
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
        else if (args.format === 'peppol') await exportPeppolBatch(rows, opts);
        else await exportPDF(rows, opts);
        return { ok: true, result: { exported: rows.length, format: args.format } };
      }

      case 'smart_search': {
        const list = await apiClient.getTransactions({});
        const rows = Array.isArray(list) ? list : list?.transactions || [];
        const hits = await smartSearch(args.query, rows, { limit: args.limit || 15 });
        return { ok: true, result: { count: hits.length, hits } };
      }

      case 'list_projects': {
        const projs = await listProjects(ctx.orgId);
        return { ok: true, result: { projects: projs } };
      }

      case 'add_project': {
        const p = await addProject(ctx.orgId, { name: args.name, client: args.client });
        return { ok: true, result: p };
      }

      case 'project_breakdown': {
        const [projs, list] = await Promise.all([
          listProjects(ctx.orgId),
          apiClient.getTransactions({}),
        ]);
        const rows = Array.isArray(list) ? list : list?.transactions || [];
        return { ok: true, result: groupByProject(rows, projs) };
      }

      case 'get_deputy': {
        const d = await getDeputy(args.managerId);
        return { ok: true, result: d };
      }

      case 'set_deputy': {
        const d = await setDeputy(args.managerId, {
          deputyId: args.deputyId, deputyName: args.deputyName,
          start: args.start, end: args.end, note: args.note,
        });
        return { ok: true, result: d };
      }

      case 'clear_deputy': {
        await clearDeputy(args.managerId);
        return { ok: true, result: { cleared: true } };
      }

      case 'get_referral': {
        const [code, premium] = await Promise.all([
          getMyCode(ctx.userId), getPremiumStatus(),
        ]);
        return { ok: true, result: { code, premium } };
      }

      case 'create_share_link': {
        const link = await createShareLink({
          orgId: ctx.orgId || 'default',
          from: args.from, to: args.to,
          ttlDays: args.ttlDays || 30,
        });
        return { ok: true, result: link };
      }

      case 'get_tx_versions': {
        const versions = await getVersions(args.txId);
        return { ok: true, result: { count: versions.length, versions } };
      }

      case 'detect_anomalies': {
        const list = await apiClient.getTransactions({});
        const rows = Array.isArray(list) ? list : list?.transactions || [];
        const flagged = rows.map(t => ({ tx: t, anomaly: detectAnomaly(t, rows) }))
          .filter(x => x.anomaly?.isAnomaly);
        return { ok: true, result: { count: flagged.length, flagged: flagged.slice(0, 10) } };
      }

      case 'get_followups': {
        const list = await apiClient.getTransactions({});
        const rows = Array.isArray(list) ? list : list?.transactions || [];
        return { ok: true, result: { suggestions: suggestFollowups(rows) } };
      }

      case 'get_nudges': {
        const list = await apiClient.getTransactions({});
        const rows = Array.isArray(list) ? list : list?.transactions || [];
        return { ok: true, result: { nudges: computeNudges(rows) } };
      }

      case 'reclaim_split': {
        const list = await apiClient.getTransactions({});
        const rows = Array.isArray(list) ? list : list?.transactions || [];
        return { ok: true, result: splitReclaim(rows) };
      }

      case 'list_categories': {
        return { ok: true, result: { categories: CATEGORIES } };
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
