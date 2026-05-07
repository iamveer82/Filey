/**
 * Web search via user-provided API key.
 * Providers: Tavily, Serper, Brave.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WEB_PROVIDERS = {
  tavily: { id: 'tavily', label: 'Tavily',  keyName: 'web_tavily_key' },
  serper: { id: 'serper', label: 'Serper',  keyName: 'web_serper_key' },
  brave:  { id: 'brave',  label: 'Brave',   keyName: 'web_brave_key' },
};

const PREF_KEY = '@filey/web_pref_v1';

export async function getWebPreference() {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: 'tavily' };
}

export async function setWebPreference(p) {
  await AsyncStorage.setItem(PREF_KEY, JSON.stringify(p));
}

export async function getWebKey(provider) {
  const def = WEB_PROVIDERS[provider];
  if (!def) return null;
  try { return await SecureStore.getItemAsync(def.keyName); } catch { return null; }
}

export async function setWebKey(provider, value) {
  const def = WEB_PROVIDERS[provider];
  if (!def) return;
  if (!value) await SecureStore.deleteItemAsync(def.keyName);
  else await SecureStore.setItemAsync(def.keyName, value);
}

async function tavilySearch(q, key) {
  const r = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, query: q, max_results: 5, search_depth: 'basic' }),
  });
  if (!r.ok) throw new Error(`Tavily ${r.status}`);
  const j = await r.json();
  return {
    results: (j.results || []).map(x => ({ title: x.title, snippet: x.content, url: x.url })),
  };
}

async function serperSearch(q, key) {
  const r = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, num: 5 }),
  });
  if (!r.ok) throw new Error(`Serper ${r.status}`);
  const j = await r.json();
  return {
    results: (j.organic || []).map(x => ({ title: x.title, snippet: x.snippet, url: x.link })),
  };
}

async function braveSearch(q, key) {
  const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5`, {
    headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`Brave ${r.status}`);
  const j = await r.json();
  return {
    results: (j.web?.results || []).map(x => ({ title: x.title, snippet: x.description, url: x.url })),
  };
}

export async function searchWeb(query) {
  const pref = await getWebPreference();
  const key = await getWebKey(pref.provider);
  if (!key) throw new Error(`No web search key for ${pref.provider}`);
  switch (pref.provider) {
    case 'tavily': return tavilySearch(query, key);
    case 'serper': return serperSearch(query, key);
    case 'brave':  return braveSearch(query, key);
    default: throw new Error('Unknown web provider');
  }
}

export async function testWebKey(provider) {
  try {
    const saved = await getWebPreference();
    await setWebPreference({ ...saved, provider });
    const res = await searchWeb('test');
    await setWebPreference(saved);
    return { ok: true, count: res.results?.length || 0 };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
