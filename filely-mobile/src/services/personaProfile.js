/**
 * Persona / soul layer.
 *
 * Lets the user shape the assistant's voice (tone, vibe, name, custom rules)
 * and lets the assistant mirror the user's natural style over time.
 *
 * Inspired by the agentic "soul" idea — the assistant should feel like a
 * specific entity (witty butler, dry coach, hyped friend) rather than a
 * neutral chat box.
 *
 * Storage: AsyncStorage @filey/persona_v1
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@filey/persona_v1';

export const VIBES = [
  {
    id: 'friend',
    label: 'Trusty Friend',
    blurb: 'Warm, casual, on your side. Cheers wins, calls out spend.',
    seed: { tone: 'warm', formality: 3, emoji: 2, slang: 'light' },
  },
  {
    id: 'butler',
    label: 'British Butler',
    blurb: 'Polished, precise, dry wit. Calls you Sir/Madam if you let it.',
    seed: { tone: 'formal-witty', formality: 9, emoji: 0, slang: 'none' },
  },
  {
    id: 'coach',
    label: 'No-BS Coach',
    blurb: 'Direct, frank, action-first. No hedging, no fluff.',
    seed: { tone: 'curt', formality: 5, emoji: 0, slang: 'none' },
  },
  {
    id: 'noir',
    label: 'Cynical Noir',
    blurb: 'Hard-boiled detective for your money. Every dirham has a story.',
    seed: { tone: 'dry-noir', formality: 6, emoji: 0, slang: 'none' },
  },
  {
    id: 'hype',
    label: 'Hype Buddy',
    blurb: 'Big energy. Treats every saving like a championship.',
    seed: { tone: 'hype', formality: 1, emoji: 3, slang: 'heavy' },
  },
  {
    id: 'monk',
    label: 'Stoic Monk',
    blurb: 'Calm, thrift-minded, gentle. Money as practice, not performance.',
    seed: { tone: 'calm', formality: 6, emoji: 0, slang: 'none' },
  },
  {
    id: 'scholar',
    label: 'Scholar',
    blurb: 'Curious, precise, loves a footnote. Treats spending like data.',
    seed: { tone: 'precise', formality: 8, emoji: 0, slang: 'none' },
  },
  {
    id: 'street',
    label: 'Street Smart',
    blurb: 'Real talk, hood-mate energy. Knows a good deal when it sees one.',
    seed: { tone: 'casual', formality: 1, emoji: 1, slang: 'heavy' },
  },
];

export const DEFAULT_PERSONA = {
  vibe: 'friend',
  agentName: 'Fili',
  preferredName: '',
  tone: 'warm',
  formality: 3,        // 0..10
  emoji: 2,            // 0=none, 1=rare, 2=moderate, 3=heavy
  slang: 'light',      // none|light|heavy
  customInstructions: '',
  greeting: '',        // optional canned greeting
  signOff: '',         // optional sign-off
  mirrorMode: true,    // adapt to user's style
  mirroredStyle: null, // populated by updateMirror
  updatedAt: null,
};

export async function getPersona() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_PERSONA, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PERSONA };
}

export async function setPersona(next) {
  const merged = { ...next, updatedAt: Date.now() };
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

export async function applyVibe(vibeId) {
  const v = VIBES.find(x => x.id === vibeId) || VIBES[0];
  const cur = await getPersona();
  return setPersona({
    ...cur,
    vibe: v.id,
    tone: v.seed.tone,
    formality: v.seed.formality,
    emoji: v.seed.emoji,
    slang: v.seed.slang,
  });
}

/* ---------- Mirroring ---------- */

const SLANG_TOKENS = [
  'bro', 'dude', 'lol', 'lmao', 'idk', 'imo', 'tbh', 'ngl', 'fr',
  'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'yeah', 'yo', 'nah',
  'bruh', 'bet', 'lit', 'fam', 'mate', 'cheers',
];
const FORMAL_TOKENS = [
  'therefore', 'hence', 'regards', 'kindly', 'please', 'sincerely',
  'pursuant', 'whilst', 'shall', 'thus', 'consequently',
];

function score(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const charCount = t.length;
  const emojiMatches = t.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [];
  const exclaim = (t.match(/!/g) || []).length;
  const allCaps = words.filter(w => w.length > 2 && w === w.toUpperCase()).length;
  const slang = words.filter(w => SLANG_TOKENS.includes(w.replace(/[^a-z]/g, ''))).length;
  const formal = words.filter(w => FORMAL_TOKENS.includes(w.replace(/[^a-z]/g, ''))).length;
  return {
    chars: charCount,
    words: words.length,
    emojiPer100: (emojiMatches.length / charCount) * 100,
    exclaimPer100: (exclaim / charCount) * 100,
    capsRate: allCaps / words.length,
    slangRate: slang / words.length,
    formalRate: formal / words.length,
  };
}

const EMA = 0.25; // weight for new sample
function blend(prev, next) {
  if (!prev) return next;
  const out = {};
  for (const k of Object.keys(next)) {
    const a = +prev[k] || 0;
    const b = +next[k] || 0;
    out[k] = a * (1 - EMA) + b * EMA;
  }
  return out;
}

/**
 * Observe a user message and update the running style snapshot.
 * Caller passes raw user text. Returns the updated persona (or null if skipped).
 */
export async function updateMirror(userText) {
  const sample = score(userText);
  if (!sample) return null;
  const cur = await getPersona();
  if (!cur.mirrorMode) return cur;
  const next = { ...cur, mirroredStyle: blend(cur.mirroredStyle, sample) };
  return setPersona(next);
}

/* ---------- System-prompt block ---------- */

function emojiHint(level) {
  if (level <= 0) return 'No emoji. None at all.';
  if (level === 1) return 'Rare emoji — at most 1 per long reply, only if it lands.';
  if (level === 2) return 'Moderate emoji — 0–2 per reply when they fit naturally.';
  return 'Frequent emoji — embrace them, but never replace words with emoji.';
}
function slangHint(level) {
  if (level === 'none') return 'Standard register, no slang.';
  if (level === 'light') return 'Light contractions OK (gonna, wanna). No heavy slang.';
  return 'Use casual slang to match a real friend talking — never forced.';
}
function formalityHint(n) {
  if (n <= 2) return 'Very casual — write like a close friend over text.';
  if (n <= 4) return 'Casual but clean — friendly, not stiff.';
  if (n <= 6) return 'Neutral — clear, professional, light warmth.';
  if (n <= 8) return 'Formal — measured, polished sentences.';
  return 'Highly formal — old-world butler register.';
}
function vibeHint(vibeId) {
  const v = VIBES.find(x => x.id === vibeId);
  if (!v) return '';
  return `Vibe: ${v.label}. ${v.blurb}`;
}

function mirrorGuidance(m) {
  if (!m) return '';
  const lines = [];
  if (m.chars && m.chars < 40) lines.push('User writes short — keep replies short too.');
  if (m.chars && m.chars > 200) lines.push('User writes long — you can match length when explaining.');
  if (m.emojiPer100 > 0.6) lines.push('User uses emoji often — mirror that energy.');
  else if (m.emojiPer100 < 0.05) lines.push('User uses no emoji — respect that, none in your replies.');
  if (m.exclaimPer100 > 1.0) lines.push('User is excited/punchy — match the energy with !s.');
  if (m.slangRate > 0.05) lines.push('User uses casual slang — match it without overdoing.');
  if (m.formalRate > 0.05) lines.push('User leans formal — match the formal register.');
  if (m.capsRate > 0.1) lines.push('User uses emphatic CAPS — use selectively for stress.');
  if (!lines.length) return '';
  return 'STYLE MIRROR (learned from your past messages):\n- ' + lines.join('\n- ');
}

/**
 * Render the persona as a system-prompt block to be appended to the agent's
 * core instructions. Keep it tight — every token costs.
 */
export function renderPersonaPrompt(persona) {
  if (!persona) return '';
  const p = { ...DEFAULT_PERSONA, ...persona };
  const lines = [];
  lines.push(`PERSONA — you are "${p.agentName || 'Fili'}".`);
  if (p.preferredName) lines.push(`Address the user as "${p.preferredName}" when natural.`);
  const v = vibeHint(p.vibe);
  if (v) lines.push(v);
  if (p.tone) lines.push(`Tone: ${p.tone}.`);
  lines.push(formalityHint(+p.formality || 0));
  lines.push(emojiHint(+p.emoji || 0));
  lines.push(slangHint(p.slang || 'none'));
  if (p.greeting) lines.push(`When you open a fresh thread, greet with: "${p.greeting}"`);
  if (p.signOff) lines.push(`Optional sign-off: "${p.signOff}" (only when it fits, not every reply).`);
  if (p.customInstructions && p.customInstructions.trim()) {
    lines.push(`CUSTOM RULES (user-set):\n${p.customInstructions.trim()}`);
  }
  const mirror = mirrorGuidance(p.mirroredStyle);
  if (mirror) lines.push(mirror);
  lines.push('Stay in character. Never apologize for the persona or break role to explain it.');
  return lines.join('\n');
}
