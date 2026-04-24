// Multi-provider LLM chat proxy with SSE streaming.
// POST { provider, apiKey, model, messages, baseUrl?, system? } → text/event-stream
//
// Supported providers:
//   anthropic       → Anthropic Messages API (native)
//   openai          → OpenAI Chat Completions (streaming)
//   openai-compat   → any OpenAI-compatible endpoint (Groq, Together, OpenRouter, Ollama, Mistral, etc.) — requires baseUrl
//   google          → Google Gemini streamGenerateContent
//
// The key lives in the browser (localStorage); the server only relays.
// This avoids shipping keys to a backend store while keeping CORS-free access to providers.

export const runtime = 'edge';

const SYSTEM_DEFAULT =
  `You are Filey AI, a finance copilot for UAE small-business owners. ` +
  `You help with VAT (5% standard rate, TRN format 100XXXXXXXXX003), invoicing, expense tracking, ` +
  `cashflow summaries, and UAE tax rules. Be concise, use AED currency, and format numbers clearly. ` +
  `When logging transactions, confirm amount, VAT portion, category, and merchant.`;

function sseChunk(text) {
  return `data: ${JSON.stringify({ delta: text })}\n\n`;
}
function sseDone() {
  return `data: [DONE]\n\n`;
}
function sseError(msg) {
  return `data: ${JSON.stringify({ error: msg })}\n\n`;
}

async function* parseSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try { yield JSON.parse(data); } catch {}
    }
  }
}

async function* streamAnthropic({ apiKey, model, messages, system }) {
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
      system: system || SYSTEM_DEFAULT,
      messages: messages.filter(m => m.role !== 'system'),
      stream: true,
    }),
  });
  if (!res.ok) { yield { _err: await res.text() }; return; }
  for await (const ev of parseSSE(res)) {
    if (ev.type === 'content_block_delta' && ev.delta?.text) {
      yield { text: ev.delta.text };
    }
  }
}

async function* streamOpenAI({ apiKey, model, messages, system, baseUrl }) {
  const url = (baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: system || SYSTEM_DEFAULT }, ...messages.filter(m => m.role !== 'system')],
      stream: true,
    }),
  });
  if (!res.ok) { yield { _err: await res.text() }; return; }
  for await (const ev of parseSSE(res)) {
    const t = ev.choices?.[0]?.delta?.content;
    if (t) yield { text: t };
  }
}

async function* streamGoogle({ apiKey, model, messages, system }) {
  const m = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const contents = messages
    .filter(x => x.role !== 'system')
    .map(x => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system || SYSTEM_DEFAULT }] },
      contents,
    }),
  });
  if (!res.ok) { yield { _err: await res.text() }; return; }
  for await (const ev of parseSSE(res)) {
    const t = ev.candidates?.[0]?.content?.parts?.[0]?.text;
    if (t) yield { text: t };
  }
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const { provider = 'anthropic', apiKey, model, messages = [], system, baseUrl } = body;

  if (!apiKey) {
    return new Response('Missing API key. Add one in Settings → AI Provider.', { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('No messages', { status: 400 });
  }

  let gen;
  if (provider === 'anthropic' || provider === 'claude') gen = streamAnthropic({ apiKey, model, messages, system });
  else if (provider === 'google' || provider === 'gemini') gen = streamGoogle({ apiKey, model, messages, system });
  else if (provider === 'openai') gen = streamOpenAI({ apiKey, model, messages, system });
  else if (provider === 'openai-compat' || provider === 'groq' || provider === 'mistral' || provider === 'openrouter' || provider === 'together' || provider === 'ollama') {
    const defaults = {
      groq: 'https://api.groq.com/openai',
      mistral: 'https://api.mistral.ai',
      openrouter: 'https://openrouter.ai/api',
      together: 'https://api.together.xyz',
      ollama: 'http://localhost:11434',
    };
    gen = streamOpenAI({ apiKey, model, messages, system, baseUrl: baseUrl || defaults[provider] });
  } else {
    return new Response('Unknown provider: ' + provider, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of gen) {
          if (ev._err) { controller.enqueue(encoder.encode(sseError(ev._err.slice(0, 500)))); break; }
          if (ev.text) controller.enqueue(encoder.encode(sseChunk(ev.text)));
        }
      } catch (e) {
        controller.enqueue(encoder.encode(sseError(String(e))));
      }
      controller.enqueue(encoder.encode(sseDone()));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}
