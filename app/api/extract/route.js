// Vision extraction proxy — turns a receipt image into structured JSON.
// POST { provider, apiKey, model, baseUrl?, imageDataUrl } → JSON { merchant, total, vat, currency, date, category, lineItems[] }
//
// Supported providers (vision-capable):
//   anthropic       → claude-* models with vision
//   openai          → gpt-4o family
//   openai-compat   → any OpenAI-compatible endpoint that supports image_url content blocks (OpenRouter etc.)
//   google          → Gemini multimodal

export const runtime = 'edge';

const SYSTEM = `You are a UAE receipt parser. Extract these fields from the receipt image and return STRICT JSON only — no prose, no markdown:
{
  "merchant": string,
  "total": number,            // VAT-inclusive grand total in receipt currency
  "vat": number,              // VAT amount (5% UAE standard rate by default)
  "currency": "AED"|"USD"|"EUR"|"GBP"|"SAR"|"INR",
  "date": "YYYY-MM-DD"|null,
  "category": "Food"|"Utilities"|"Travel"|"Supplies"|"Software"|"Rent"|"Marketing"|"Freelance"|"Other",
  "lineItems": [{ "desc": string, "qty": number, "rate": number }]
}
Rules:
- If VAT is not shown, compute as total * 0.05 / 1.05 (UAE 5% inclusive).
- Default currency to "AED" if unknown.
- Use a UAE-friendly category mapping (DEWA/Etisalat → Utilities, Careem/Uber → Travel, Adobe/Figma → Software, etc.).
- Output JSON only — no surrounding text or code fences.`;

function dataUrlParts(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { mediaType: m[1], data: m[2] };
}

function safeJson(text) {
  if (!text) return null;
  // Strip markdown code fences if any
  const cleaned = String(text).trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  // Try to find first { ... } block
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
}

async function callAnthropic({ apiKey, model, parts }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: parts.mediaType, data: parts.data } },
          { type: 'text', text: 'Extract receipt fields as JSON.' },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 500));
  const j = await res.json();
  const text = (j.content || []).map((c) => c.text || '').join('');
  return text;
}

async function callOpenAI({ apiKey, model, parts, baseUrl }) {
  const url = (baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract receipt fields as JSON.' },
            { type: 'image_url', image_url: { url: `data:${parts.mediaType};base64,${parts.data}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 500));
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

async function callGoogle({ apiKey, model, parts }) {
  const m = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{
        role: 'user',
        parts: [
          { text: 'Extract receipt fields as JSON.' },
          { inlineData: { mimeType: parts.mediaType, data: parts.data } },
        ],
      }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 500));
  const j = await res.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const { provider = 'anthropic', apiKey, model, baseUrl, imageDataUrl } = body;
  if (!apiKey) return Response.json({ error: 'Missing API key. Add one in Settings → AI Provider.' }, { status: 400 });
  const parts = dataUrlParts(imageDataUrl);
  if (!parts) return Response.json({ error: 'Bad imageDataUrl — must be data:image/...;base64,…' }, { status: 400 });

  try {
    let text = '';
    if (provider === 'anthropic' || provider === 'claude') {
      text = await callAnthropic({ apiKey, model, parts });
    } else if (provider === 'google' || provider === 'gemini') {
      text = await callGoogle({ apiKey, model, parts });
    } else if (provider === 'openai') {
      text = await callOpenAI({ apiKey, model, parts });
    } else if (provider === 'openai-compat' || provider === 'openrouter' || provider === 'ollama-cloud') {
      const defaults = {
        openrouter: 'https://openrouter.ai/api',
        // Ollama Cloud vision models (e.g. gpt-oss:120b-cloud, qwen3-vl:235b-cloud)
        'ollama-cloud': 'https://ollama.com',
      };
      text = await callOpenAI({ apiKey, model, parts, baseUrl: baseUrl || defaults[provider] });
    } else {
      return Response.json({ error: `Provider ${provider} does not support vision extraction. Use Anthropic, OpenAI, Google, OpenRouter, or Ollama Cloud.` }, { status: 400 });
    }
    const json = safeJson(text);
    if (!json) return Response.json({ error: 'Model did not return valid JSON', raw: text.slice(0, 500) }, { status: 502 });
    return Response.json({ ok: true, data: json, raw: text.slice(0, 4000) });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 502 });
  }
}
