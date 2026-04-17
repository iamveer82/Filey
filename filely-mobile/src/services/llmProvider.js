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
};

const PREF_KEY = '@filey/llm_pref_v1';

export async function getPreference() {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: 'gemma', model: 'gemma-2b-it', useWeb: false };
}

export async function setPreference(pref) {
  await AsyncStorage.setItem(PREF_KEY, JSON.stringify(pref));
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

async function callOpenAI({ messages, model, key, maxTokens }) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens || 1024, temperature: 0.7 }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { text: j.choices?.[0]?.message?.content || '' };
}

async function callAnthropic({ messages, model, key, maxTokens }) {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const msgs = messages.filter(m => m.role !== 'system');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, messages: msgs, system: system || undefined, max_tokens: maxTokens || 1024 }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { text: j.content?.[0]?.text || '' };
}

async function callGemini({ messages, model, key, maxTokens }) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens || 1024, temperature: 0.7 },
  };
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { text: j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '' };
}

async function callOpenRouter({ messages, model, key, maxTokens }) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://filey.app',
      'X-Title': 'Filey',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens || 1024 }),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { text: j.choices?.[0]?.message?.content || '' };
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

  const args = { messages: msgs, model, key, maxTokens: opts.maxTokens };
  let out;
  switch (provider) {
    case 'gemma':      out = await callGemma(args); break;
    case 'openai':     out = await callOpenAI(args); break;
    case 'anthropic':  out = await callAnthropic(args); break;
    case 'gemini':     out = await callGemini(args); break;
    case 'openrouter': out = await callOpenRouter(args); break;
    default: throw new Error(`Provider ${provider} not implemented`);
  }

  return { text: out.text, meta: { provider, model, webUsed: !!webCtx, citations } };
}
