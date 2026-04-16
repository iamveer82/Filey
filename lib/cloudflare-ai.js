/**
 * Cloudflare Workers AI Service
 *
 * Calls Cloudflare Workers AI for inference (chat and receipt parsing).
 * Falls back gracefully when env vars are missing or the API is unreachable.
 *
 * Required env vars:
 *   CF_ACCOUNT_ID  — Cloudflare account ID
 *   CF_API_TOKEN   — API token with Workers AI permission
 *   CF_AI_MODEL    — Model to use (default: @cf/google/gemma-4-26b-a4b-it)
 */

const DEFAULT_MODEL = '@cf/google/gemma-4-26b-a4b-it';
const CF_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

function getConfig() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const model = process.env.CF_AI_MODEL || DEFAULT_MODEL;
  return { accountId, apiToken, model };
}

export function isCloudflareAIAvailable() {
  const { accountId, apiToken } = getConfig();
  return !!(accountId && apiToken);
}

/**
 * Call Cloudflare Workers AI with a messages array.
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [options] — { maxTokens, temperature }
 * @returns {Promise<string>} — The assistant's reply text
 */
export async function callCloudflareAI(messages, options = {}) {
  const { accountId, apiToken, model } = getConfig();

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare AI not configured: CF_ACCOUNT_ID and CF_API_TOKEN required');
  }

  const url = `${CF_API_BASE}/${accountId}/ai/run/${model}`;

  const body = {
    messages,
    max_tokens: options.maxTokens || 512,
    temperature: options.temperature ?? 0.3,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try { detail = JSON.parse(text).errors?.[0]?.message || text; } catch {}
    throw new Error(`Cloudflare AI API error (${res.status}): ${detail}`);
  }

  const data = await res.json();

  const choice = data.result?.choices?.[0];

  // OpenAI-compatible: content field (standard models)
  if (choice?.message?.content) {
    return choice.message.content.trim();
  }

  // Thinking/reasoning models (e.g. gemma-4-26b-a4b-it): content is null, text is in reasoning
  if (choice?.message?.reasoning) {
    return choice.message.reasoning.trim();
  }

  // Legacy format: { result: { response: "..." } }
  if (data.result?.response) {
    return data.result.response.trim();
  }

  // Another legacy format: { result: { message: { content: "..." } } }
  if (data.result?.message?.content) {
    return data.result.message.content.trim();
  }

  throw new Error('Unexpected Cloudflare AI response format: ' + JSON.stringify(data).slice(0, 200));
}

/**
 * Build a system prompt for Filey's UAE finance assistant.
 */
function fileySystemPrompt() {
  return `You are Filey, a friendly UAE business finance assistant. You help freelancers and small businesses track expenses, income, and VAT in AED (UAE Dirhams).

Your capabilities:
- Extract transaction details from natural language (amount, merchant, category, payment method)
- Answer questions about UAE VAT (5%), TRN requirements, and business finance
- Categorize expenses into: Food, Transport, Shopping, Office, Utilities, Entertainment, Health, Travel, Banking, Income, General
- Calculate VAT at 5% for expenses
- Support AED currency by default

When a user mentions an expense or income, extract:
- type: "expense" or "income"
- merchant: who they paid or received from
- amount: the number in AED
- category: best match from the list above
- payment_method: Cash, Card, Bank Transfer, Online
- description: brief summary

When you extract a transaction, start your reply with [TXN] followed by a JSON block, then give a friendly explanation. Example:
[TXN]{"type":"expense","merchant":"ENOC","amount":50,"category":"Transport","payment_method":"Card","vat":2.5,"currency":"AED"}
Recorded: ENOC — 50 AED (Transport, Card). VAT: 2.5 AED.

For income:
[TXN]{"type":"income","merchant":"Client ABC","amount":5000,"category":"Income","payment_method":"Bank Transfer","currency":"AED"}
Got it! 5,000 AED received from Client ABC (Bank Transfer). Income logged.

If no transaction is detected, just respond conversationally. Keep replies concise and helpful.`;
}

/**
 * Chat with Filey AI via Cloudflare Workers AI.
 * Returns { reply: string, transaction: object|null }
 */
export async function chatWithFileyAI(userMessage) {
  const messages = [
    { role: 'system', content: fileySystemPrompt() },
    { role: 'user', content: userMessage },
  ];

  const reply = await callCloudflareAI(messages, { maxTokens: 800, temperature: 0.3 });

  // Try to extract [TXN] block
  let transaction = null;
  const txnMatch = reply.match(/\[TXN\](\{[^}]+\})/);
  if (txnMatch) {
    try {
      transaction = JSON.parse(txnMatch[1]);
      transaction.date = new Date().toISOString().split('T')[0];
      transaction.status = 'pending';
      transaction.description = userMessage;
    } catch {
      // Malformed JSON — ignore
    }
  }

  // Clean the reply (remove [TXN] marker from displayed text)
  const cleanReply = reply.replace(/\[TXN\]\{[^}]+\}\s*/, '');

  return { reply: cleanReply, transaction };
}

/**
 * Parse OCR text from a receipt using Cloudflare Workers AI.
 * Returns a structured transaction object.
 */
export async function parseReceiptWithAI(ocrText) {
  const messages = [
    {
      role: 'system',
      content: `You are an OCR receipt parser for UAE receipts. Extract structured data from the receipt text.
Return ONLY a JSON object with these fields:
- merchant: string (business name)
- date: string (YYYY-MM-DD format, or today if unclear)
- amount: number (total amount in AED)
- vat: number (VAT amount, 0 if not found)
- trn: string (15-digit tax registration number, or empty string)
- currency: "AED"
- category: one of [Food, Transport, Shopping, Office, Utilities, Entertainment, Health, Travel, Banking, General]
- paymentMethod: one of [Cash, Credit Card, Debit Card, Online]

UAE VAT is 5%. If VAT line is missing but amount looks like it includes VAT, calculate 5% of the pre-VAT amount.`,
    },
    { role: 'user', content: `Parse this UAE receipt:\n\n${ocrText}` },
  ];

  const reply = await callCloudflareAI(messages, { maxTokens: 512, temperature: 0.1 });

  // Try to parse the JSON response
  try {
    // The model might return JSON with or without markdown code blocks
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        merchant: parsed.merchant || 'Unknown Merchant',
        date: parsed.date || new Date().toISOString().split('T')[0],
        amount: Math.round((parseFloat(parsed.amount) || 0) * 100) / 100,
        vat: Math.round((parseFloat(parsed.vat) || 0) * 100) / 100,
        trn: parsed.trn || '',
        currency: 'AED',
        category: parsed.category || 'General',
        paymentMethod: parsed.paymentMethod || 'Cash',
      };
    }
  } catch {
    // Model didn't return valid JSON — fall through
  }

  return null;
}