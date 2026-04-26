'use client';

/**
 * Slash command registry for /chat composer.
 *
 * Each command:
 *   { name, args?, desc, run({ rest, ctx }) → Promise<{ kind, ... }> }
 *
 * Result kinds:
 *   - 'navigate'  : router.push(url)
 *   - 'inject'    : replace draft with text (user reviews then sends)
 *   - 'send'      : send the given text immediately as a user message
 *   - 'system'    : append a synthetic assistant message (no API call)
 *   - 'patch-ai'  : merge fields into the saved AI config (e.g. /model)
 *   - 'noop'      : nothing
 */

export const COMMANDS = [
  {
    name: 'scan',
    desc: 'Open the receipt scanner',
    run: () => ({ kind: 'navigate', url: '/scan' }),
  },
  {
    name: 'bulk',
    desc: 'Open the bulk receipt drop-zone',
    run: () => ({ kind: 'navigate', url: '/bulk' }),
  },
  {
    name: 'invoice',
    desc: 'Open the invoice builder',
    run: () => ({ kind: 'navigate', url: '/invoice' }),
  },
  {
    name: 'tx',
    desc: 'Open the transactions ledger',
    run: () => ({ kind: 'navigate', url: '/transactions' }),
  },
  {
    name: 'reports',
    desc: 'Open VAT + profit reports',
    run: () => ({ kind: 'navigate', url: '/reports' }),
  },
  {
    name: 'settings',
    desc: 'Open settings',
    run: () => ({ kind: 'navigate', url: '/settings' }),
  },

  {
    name: 'log',
    args: '<amount> <merchant>',
    desc: 'Add a transaction (e.g. `/log 500 AED Zain`)',
    run: ({ rest }) => ({
      kind: 'send',
      text: `Log this transaction for me: ${rest || '(no details)'} — confirm amount, VAT (5% UAE inclusive), merchant, category, and today's date before adding.`,
    }),
  },
  {
    name: 'vat',
    desc: 'Get this quarter\'s VAT summary',
    run: () => ({
      kind: 'send',
      text: 'Compute my UAE VAT this quarter. Show output VAT, input VAT, net payable, and the FTA filing deadline.',
    }),
  },
  {
    name: 'profit',
    desc: 'Net profit for the last 30 days',
    run: () => ({
      kind: 'send',
      text: 'Compute my net profit for the last 30 days. Break down income, expenses, and the top three categories driving each.',
    }),
  },
  {
    name: 'recurring',
    desc: 'List detected recurring bills',
    run: () => ({
      kind: 'send',
      text: 'List my recurring bills with cadence, average amount, and next expected date. Flag any that look anomalous.',
    }),
  },
  {
    name: 'export',
    args: '[csv|xlsx]',
    desc: 'Export your ledger',
    run: ({ rest }) => {
      const fmt = (rest || 'csv').trim().toLowerCase();
      return { kind: 'navigate', url: `/transactions?export=${fmt === 'xlsx' ? 'xlsx' : 'csv'}` };
    },
  },

  {
    name: 'clear',
    desc: 'Clear this thread',
    run: () => ({ kind: 'clear-thread' }),
  },
  {
    name: 'new',
    desc: 'Start a new chat thread',
    run: () => ({ kind: 'new-thread' }),
  },
  {
    name: 'model',
    args: '<model-id>',
    desc: 'Switch model for this session (e.g. `/model gpt-oss:120b-cloud`)',
    run: ({ rest }) => {
      const id = (rest || '').trim();
      if (!id) return { kind: 'system', text: '⚠ Pass a model id, e.g. `/model claude-sonnet-4-20250514`.' };
      return { kind: 'patch-ai', patch: { model: id }, system: `✓ Model set to **${id}**. Saved to Settings.` };
    },
  },
  {
    name: 'think',
    desc: 'Ask the model to reason step-by-step before answering',
    run: ({ rest }) => ({
      kind: 'send',
      text: `<think_step_by_step>\n${rest || 'Continue with the previous question, but reason carefully step by step before giving the final answer.'}`,
    }),
  },
  {
    name: 'help',
    desc: 'Show all slash commands',
    run: () => {
      const lines = COMMANDS.map(c => `- **/${c.name}${c.args ? ' ' + c.args : ''}** — ${c.desc}`);
      return { kind: 'system', text: `### Slash commands\n\n${lines.join('\n')}\n\nTab to autocomplete · Esc to cancel.` };
    },
  },
];

const BY_NAME = Object.fromEntries(COMMANDS.map(c => [c.name, c]));

export function parseSlash(text) {
  // Returns { name, rest } if text starts with `/<name>`, else null.
  if (!text || text[0] !== '/') return null;
  const m = /^\/([\w-]+)(?:\s+([\s\S]*))?$/.exec(text.trim());
  if (!m) return null;
  return { name: m[1].toLowerCase(), rest: m[2] || '' };
}

export function lookupCommand(name) {
  return BY_NAME[name] || null;
}

export function suggestionsFor(text) {
  // Show suggestions when draft starts with `/` and the cursor is on the command token.
  if (!text || text[0] !== '/') return [];
  const head = text.slice(1).split(/\s/)[0].toLowerCase();
  return COMMANDS.filter(c => c.name.startsWith(head));
}
