/**
 * Unified LLM provider layer.
 * Supports: offline Gemma (on-device), OpenAI, Anthropic, Gemini, OpenRouter.
 * Keys stored in expo-secure-store. User picks provider in Settings.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchWeb } from './webSearch';

export const PROVIDERS = {
  gemma:     { id: 'gemma',     label: 'Offline Gemma',  keyName: null,                 web: false, models: ['gemma-2b-it'] },
  openai:    { id: 'openai',    label: 'OpenAI',         keyName: 'llm_openai_key',     web: true,  models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'] },
  anthropic: { id: 'anthropic', label: 'Anthropic',      keyName: 'llm_anthropic_key',  web: true,  models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-opus-4-5'] },
  gemini:    { id: 'gemini',    label: 'Google Gemini',  keyName: 'llm_gemini_key',     web: true,  models: ['gemini-2.0-flash', 'gemini-1.5-pro'] },
  openrouter:{ id: 'openrouter',label: 'OpenRouter',     keyName: 'llm_openrouter_key', web: true,  models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'meta-llama/llama-3.1-70b-instruct'] },
  ollama:    { id: 'ollama',    label: 'Ollama (local)', keyName: null,                 web: false, models: ['llama3.2', 'llama3.1', 'qwen2.5', 'mistral', 'phi3', 'gemma2'] },
  ollamacloud:{id: 'ollamacloud',label: 'Ollama Cloud',   keyName: 'llm_ollama_key',     web: false, models: ['glm-4.6:cloud', 'deepseek-v3.1:671b-cloud', 'qwen3-coder:480b-cloud', 'gpt-oss:120b-cloud', 'kimi-k2:1t-cloud'] },
};

const PREF_KEY = '@filey/llm_pref_v1';
const OLLAMA_URL_KEY = '@filey/ollama_base_url';
const RECENT_KEY = '@filey/llm_recent_v1';
const DEFAULT_OLLAMA_URL = 'http://192.168.1.100:11434';

// Friendly taglines per model id — shown under the name in dropdowns.
export const MODEL_TAGLINES = {
  'claude-opus-4-5':            'Most capable for ambitious work',
  'claude-3-5-sonnet-latest':   'Most efficient for everyday tasks',
  'claude-3-5-haiku-latest':    'Fastest for quick answers',
  'gpt-4o':                     'OpenAI flagship — most capable',
  'gpt-4o-mini':                'Fast and cheap for everyday work',
  'gpt-4-turbo':                'Strong reasoning, broad knowledge',
  'gemini-2.0-flash':           'Fast multimodal, low latency',
  'gemini-1.5-pro':             'Long-context expert',
  'gemma-2b-it':                'On-device offline, private',
  'llama3.2':                   'Local Llama, balanced',
  'llama3.1':                   'Local Llama, broad capability',
  'qwen2.5':                    'Local Qwen, multilingual',
  'mistral':                    'Local Mistral, fast',
  'phi3':                       'Local Phi-3, compact',
  'gemma2':                     'Local Gemma, lightweight',
};
export function modelTagline(model) {
  if (!model) return '';
  return MODEL_TAGLINES[model] || '';
}

/**
 * Recent models: rolling list of the last 3 unique {provider, model} pairs the
 * user actually used. The current selection lives at index 0; the dropdown
 * shows index 0 as "current" plus up to two prior entries.
 */
export async function getRecentModels(limit = 3) {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export async function recordModelUse(provider, model) {
  if (!provider || !model) return;
  try {
    const cur = await getRecentModels(10);
    const filtered = cur.filter(e => !(e?.provider === provider && e?.model === model));
    const next = [{ provider, model }, ...filtered].slice(0, 3);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

export async function clearRecentModels() {
  try { await AsyncStorage.removeItem(RECENT_KEY); } catch {}
}

export async function getOllamaBaseUrl() {
  try {
    const v = await AsyncStorage.getItem(OLLAMA_URL_KEY);
    return v || DEFAULT_OLLAMA_URL;
  } catch { return DEFAULT_OLLAMA_URL; }
}

export async function setOllamaBaseUrl(url) {
  await AsyncStorage.setItem(OLLAMA_URL_KEY, url.replace(/\/+$/, ''));
}

export async function listOllamaModels() {
  const base = await getOllamaBaseUrl();
  const r = await fetch(`${base}/api/tags`);
  if (!r.ok) throw new Error(`Ollama ${r.status}`);
  const j = await r.json();
  return (j.models || []).map(m => m.name);
}

export async function getPreference() {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: 'gemma', model: 'gemma-2b-it', useWeb: false };
}

export async function setPreference(pref) {
  await AsyncStorage.setItem(PREF_KEY, JSON.stringify(pref));
  if (pref?.provider && pref?.model) {
    recordModelUse(pref.provider, pref.model).catch(() => {});
  }
}

export async function getKey(provider) {
  const def = PROVIDERS[provider];
  if (!def?.keyName) return null;
  try { return await SecureStore.getItemAsync(def.keyName); } catch { return null; }
}

export async function setKey(provider, value) {
  const def = PROVIDERS[provider];
  if (!def?.keyName) return;
  if (!value) await SecureStore.deleteItemAsync(def.keyName);
  else await SecureStore.setItemAsync(def.keyName, value);
}

export async function testKey(provider) {
  try {
    const out = await send([{ role: 'user', content: 'ping' }], { provider, maxTokens: 8 });
    return { ok: true, sample: (out.text || '').slice(0, 40) };
  } catch (e) {
    return { ok: false, error: e.message || 'Connection failed' };
  }
}

// ---------- Adapters ----------

async function parseSSE(response, onToken, extractFn) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    // React Native sometimes lacks ReadableStream; fallback to full text.
    const txt = await response.text();
    let acc = '';
    for (const line of txt.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const delta = extractFn(JSON.parse(payload));
        if (delta) { acc += delta; onToken?.(delta, acc); }
      } catch {}
    }
    return acc;
  }
  const dec = new TextDecoder();
  let buf = '';
  let acc = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const delta = extractFn(JSON.parse(payload));
        if (delta) { acc += delta; onToken?.(delta, acc); }
      } catch {}
    }
  }
  return acc;
}

async function callOpenAI({ messages, model, key, maxTokens, signal, onToken, tools }) {
  const body = { model, messages, max_tokens: maxTokens || 1024, temperature: 0.7, stream: !!onToken };
  if (tools?.length) { body.tools = tools; body.tool_choice = 'auto'; }
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  if (onToken) {
    const text = await parseSSE(r, onToken, (j) => j.choices?.[0]?.delta?.content || '');
    return { text };
  }
  const j = await r.json();
  const choice = j.choices?.[0]?.message;
  return { text: choice?.content || '', toolCalls: choice?.tool_calls };
}

async function callAnthropic({ messages, model, key, maxTokens, signal, onToken, tools }) {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const msgs = messages.filter(m => m.role !== 'system');
  const body = { model, messages: msgs, system: system || undefined, max_tokens: maxTokens || 1024, stream: !!onToken };
  if (tools?.length) body.tools = tools;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  if (onToken) {
    const text = await parseSSE(r, onToken, (j) => {
      if (j.type === 'content_block_delta') return j.delta?.text || '';
      return '';
    });
    return { text };
  }
  const j = await r.json();
  const blocks = j.content || [];
  const textPart = blocks.find(b => b.type === 'text')?.text || '';
  const toolUse = blocks.filter(b => b.type === 'tool_use');
  return { text: textPart, toolCalls: toolUse.length ? toolUse : undefined };
}

async function callGemini({ messages, model, key, maxTokens, signal, onToken }) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const endpoint = onToken ? 'streamGenerateContent' : 'generateContent';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${encodeURIComponent(key)}${onToken ? '&alt=sse' : ''}`;
  const body = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens || 1024, temperature: 0.7 },
  };
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  if (onToken) {
    const text = await parseSSE(r, onToken, (j) => j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '');
    return { text };
  }
  const j = await r.json();
  return { text: j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '' };
}

async function callOpenRouter({ messages, model, key, maxTokens, signal, onToken }) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://filey.app',
      'X-Title': 'Filey',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens || 1024, stream: !!onToken }),
    signal,
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${await r.text()}`);
  if (onToken) {
    const text = await parseSSE(r, onToken, (j) => j.choices?.[0]?.delta?.content || '');
    return { text };
  }
  const j = await r.json();
  return { text: j.choices?.[0]?.message?.content || '' };
}

async function callOllama({ messages, model, maxTokens, signal, onToken, key, cloud }) {
  const base = cloud ? 'https://ollama.com' : await getOllamaBaseUrl();
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  const body = {
    model: model || 'llama3.2',
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: !!onToken,
    options: { num_predict: maxTokens || 1024, temperature: 0.7 },
  };
  const r = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) throw new Error(`Ollama ${r.status}: ${await r.text()}`);
  if (onToken) {
    const reader = r.body?.getReader?.();
    if (!reader) {
      const txt = await r.text();
      let acc = '';
      for (const line of txt.split('\n')) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          const delta = j.message?.content || '';
          if (delta) { acc += delta; onToken(delta, acc); }
        } catch {}
      }
      return { text: acc };
    }
    const dec = new TextDecoder();
    let buf = '', acc = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          const delta = j.message?.content || '';
          if (delta) { acc += delta; onToken(delta, acc); }
        } catch {}
      }
    }
    return { text: acc };
  }
  const j = await r.json();
  return { text: j.message?.content || '' };
}

async function callGemma({ messages }) {
  // Offline Gemma via native module. Lazy import to avoid top-level crash.
  try {
    const mod = require('./gemmaInference');
    const infer = mod.runInference || mod.generate || mod.default;
    if (!infer) throw new Error('Gemma inference fn missing');
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
    const out = await infer(prompt);
    return { text: typeof out === 'string' ? out : out?.text || '' };
  } catch (e) {
    throw new Error(`Offline model unavailable: ${e.message}`);
  }
}

// ---------- Public send() ----------

/**
 * send(messages, opts)
 *  messages: [{role:'system'|'user'|'assistant', content:string}]
 *  opts: { provider?, model?, useWeb?, maxTokens? }
 * Returns: { text, meta: { provider, model, webUsed, citations? } }
 */
export async function send(messages, opts = {}) {
  const pref = await getPreference();
  const provider = opts.provider || pref.provider;
  const def = PROVIDERS[provider];
  if (!def) throw new Error(`Unknown provider: ${provider}`);
  const model = opts.model || pref.model || def.models[0];
  const useWeb = opts.useWeb ?? pref.useWeb;

  let webCtx = null;
  let citations = [];
  if (useWeb && def.web) {
    const last = [...messages].reverse().find(m => m.role === 'user');
    if (last) {
      try {
        const res = await searchWeb(last.content);
        if (res?.results?.length) {
          webCtx = res.results.slice(0, 5)
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\n${r.url}`)
            .join('\n\n');
          citations = res.results.slice(0, 5).map(r => ({ title: r.title, url: r.url }));
        }
      } catch {}
    }
  }

  const msgs = webCtx
    ? [
        { role: 'system', content: `You have live web search results. Cite with [n] when using them.\n\nSEARCH RESULTS:\n${webCtx}` },
        ...messages,
      ]
    : messages;

  let key = null;
  if (def.keyName) {
    key = await getKey(provider);
    if (!key) throw new Error(`No API key set for ${def.label}. Add one in Settings.`);
  }

  const args = {
    messages: msgs, model, key,
    maxTokens: opts.maxTokens,
    signal: opts.signal,
    onToken: opts.onToken,
    tools: opts.tools,
  };
  let out;
  switch (provider) {
    case 'gemma':      out = await callGemma(args); break;
    case 'openai':     out = await callOpenAI(args); break;
    case 'anthropic':  out = await callAnthropic(args); break;
    case 'gemini':     out = await callGemini(args); break;
    case 'openrouter': out = await callOpenRouter(args); break;
    case 'ollama':      out = await callOllama(args); break;
    case 'ollamacloud': out = await callOllama({ ...args, cloud: true }); break;
    default: throw new Error(`Provider ${provider} not implemented`);
  }

  return {
    text: out.text,
    toolCalls: out.toolCalls,
    meta: { provider, model, webUsed: !!webCtx, citations },
  };
}
