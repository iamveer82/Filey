export const runtime = 'edge';

/* ─── Tool-specific prompts ─── */
const TOOL_PROMPTS = {
  receipt: `You are a UAE receipt parser. Extract these fields from the receipt image and return STRICT JSON only — no prose, no markdown:
{
  "merchant": string,
  "total": number,
  "vat": number,
  "currency": "AED"|"USD"|"EUR"|"GBP"|"SAR"|"INR",
  "date": "YYYY-MM-DD"|null,
  "category": "Food"|"Utilities"|"Travel"|"Supplies"|"Software"|"Rent"|"Marketing"|"Freelance"|"Other",
  "lineItems": [{ "desc": string, "qty": number, "rate": number }]
}
Rules:
- If VAT is not shown, compute as total * 0.05 / 1.05 (UAE 5% inclusive).
- Default currency to "AED" if unknown.
- Use a UAE-friendly category mapping.
- Output JSON only — no surrounding text or code fences.`,

  watermark: `You are a document analyst. Given a document's metadata and any extracted text, suggest an appropriate watermark text. Return STRICT JSON:
{
  "watermark": "suggested text (1–3 words)",
  "reason": "brief explanation"
}
Prefer: CONFIDENTIAL for sensitive docs, DRAFT for unfinished docs, SAMPLED for examples, INTERNAL for internal-use docs.`,

  sign: `You are a document analyst. Given a document's metadata and content, suggest signature text. Return STRICT JSON:
{
  "signText": "Signed: Name",
  "position": "bottom-right",
  "reason": "brief explanation"
}`,

  protect: `You are a security analyst. Given a document's metadata and content, classify its sensitivity. Return STRICT JSON:
{
  "classification": "public"|"internal"|"confidential"|"restricted",
  "suggestedPassword": "strong password",
  "reason": "brief explanation"
}`,

  merge: `You are a document analyst. Given multiple PDFs' metadata and summaries, suggest the best merge order. Return STRICT JSON:
{
  "order": [0, 1, 2],
  "summary": "brief combined summary",
  "reason": "why this order"
}`,

  split: `You are a document analyst. Given a PDF's metadata and content, suggest logical split points. Return STRICT JSON:
{
  "splits": [{"page": number, "reason": "why split here"}],
  "summary": "brief document summary"
}`,

  compress: `You are a document analyst. Given a PDF's metadata, estimate compression potential. Return STRICT JSON:
{
  "estimatedReduction": "e.g. 30%",
  "suggestions": ["tip 1", "tip 2"],
  "summary": "brief analysis"
}`,

  rotate: `You are a document analyst. Given a PDF's metadata and any content clues, detect page orientation. Return STRICT JSON:
{
  "orientation": "portrait"|"landscape"|"mixed",
  "suggestedRotation": 0|90|180|270,
  "reason": "brief explanation"
}`,

  invoice: `You are an invoice generation assistant. Given user input and any uploaded letterhead image, suggest or complete invoice fields. Return STRICT JSON only:
{
  "buyerName": string,
  "buyerAddress": string,
  "buyerTRN": string,
  "invoiceNo": string,
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "sellerName": string,
  "sellerAddress": string,
  "sellerTRN": string,
  "items": [{ "desc": string, "serialNo": string, "qty": number, "rate": number, "amount": number }],
  "subtotal": number,
  "vatRate": 5,
  "vat": number,
  "total": number,
  "currency": "AED",
  "notes": string,
  "paymentTerms": string,
  "bankDetails": string,
  "template": "professional"|"minimal"|"modern",
  "reason": "brief explanation of choices"
}
Rules:
- Default currency "AED", VAT rate 5% (UAE standard).
- Compute amount = qty * rate for each item.
- Compute subtotal = sum of amounts.
- Compute vat = subtotal * vatRate / 100.
- Compute total = subtotal + vat.
- If user provides sparse input, infer reasonable defaults.
- Output JSON only — no surrounding text or code fences.`,
};

/* ─── Helpers ─── */
function dataUrlParts(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { mediaType: m[1], data: m[2] };
}

function safeJson(text) {
  if (!text) return null;
  const cleaned = String(text).trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

function buildUserContent(tool, files, opts) {
  const lines = [`Tool: ${tool}`];
  if (opts && Object.keys(opts).length) lines.push(`User options: ${JSON.stringify(opts)}`);
  files.forEach((f, i) => {
    lines.push(`File ${i + 1}: ${f.name} (${f.type}, ${f.pages || '?'} pages)`);
    if (f.text) lines.push(`Text snippet: ${f.text.slice(0, 1200)}`);
  });
  return lines.join('\n');
}

/* ─── Provider callers ─── */
async function callAnthropic({ apiKey, model, system, content, imageParts }) {
  const messages = [];
  if (imageParts?.length) {
    const contentBlocks = [
      ...imageParts.map(p => ({
        type: 'image',
        source: { type: 'base64', media_type: p.mediaType, data: p.data },
      })),
      { type: 'text', text: content },
    ];
    messages.push({ role: 'user', content: contentBlocks });
  } else {
    messages.push({ role: 'user', content });
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system,
      messages,
    }),
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 500));
  const j = await res.json();
  return (j.content || []).map(c => c.text || '').join('');
}

async function callOpenAI({ apiKey, model, system, content, imageParts, baseUrl }) {
  const url = (baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
  const userContent = imageParts?.length
    ? [
        { type: 'text', text: content },
        ...imageParts.map(p => ({
          type: 'image_url',
          image_url: { url: `data:${p.mediaType};base64,${p.data}` },
        })),
      ]
    : content;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 500));
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

async function callGoogle({ apiKey, model, system, content, imageParts }) {
  const m = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const parts = [{ text: content }];
  if (imageParts?.length) {
    imageParts.forEach(p => parts.push({ inlineData: { mimeType: p.mediaType, data: p.data } }));
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 500));
  const j = await res.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/* ─── Route ─── */
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const { provider = 'anthropic', apiKey, model, baseUrl, tool, opts = {}, files = [] } = body;
  if (!apiKey) return Response.json({ error: 'Missing API key. Add one in Settings → AI Provider.' }, { status: 400 });
  if (!tool || !TOOL_PROMPTS[tool]) return Response.json({ error: `Unknown tool: ${tool}` }, { status: 400 });

  const system = TOOL_PROMPTS[tool];
  const content = buildUserContent(tool, files, opts);
  const imageParts = files
    .filter(f => f.dataUrl && f.type?.startsWith('image/'))
    .map(f => dataUrlParts(f.dataUrl))
    .filter(Boolean);

  try {
    let text = '';
    if (provider === 'anthropic' || provider === 'claude') {
      text = await callAnthropic({ apiKey, model, system, content, imageParts });
    } else if (provider === 'google' || provider === 'gemini') {
      text = await callGoogle({ apiKey, model, system, content, imageParts });
    } else if (provider === 'openai') {
      text = await callOpenAI({ apiKey, model, system, content, imageParts });
    } else if (provider === 'openai-compat' || provider === 'openrouter' || provider === 'ollama-cloud') {
      const defaults = { openrouter: 'https://openrouter.ai/api', 'ollama-cloud': 'https://ollama.com' };
      text = await callOpenAI({ apiKey, model, system, content, imageParts, baseUrl: baseUrl || defaults[provider] });
    } else {
      return Response.json({ error: `Provider ${provider} not supported.` }, { status: 400 });
    }
    const json = safeJson(text);
    if (!json) return Response.json({ error: 'Model did not return valid JSON', raw: text.slice(0, 500) }, { status: 502 });
    return Response.json({ ok: true, data: json, raw: text.slice(0, 4000) });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 502 });
  }
}
