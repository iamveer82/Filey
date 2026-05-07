'use client';

/**
 * Reads a File into the attachment shape that /api/chat expects.
 *
 * Output shape:
 *   { id, name, kind, mediaType, dataB64?, text?, size }
 *   kind = 'image' | 'document' | 'text'
 *
 * - image/*           → kind: 'image',    dataB64
 * - application/pdf   → kind: 'document', dataB64 (Anthropic + Google read natively;
 *                                                   OpenAI-style providers ignore it)
 * - text/*, csv, json → kind: 'text',     text (inlined into the prompt)
 *
 * Files larger than 10MB are rejected so the JSON request stays under the edge limit.
 */

export const MAX_BYTES = 10 * 1024 * 1024;

const TEXT_EXT_RE = /\.(txt|md|csv|tsv|json|log|yaml|yml|xml|html?|js|ts|jsx|tsx|py|rb|go|rs|java|cs|c|cpp|sh|sql|toml|ini|env)$/i;

export function attachmentSupport(provider) {
  // Returns { image, pdf, text } booleans for the chosen provider.
  switch (provider) {
    case 'anthropic':
    case 'claude':
      return { image: true, pdf: true,  text: true };
    case 'google':
    case 'gemini':
      return { image: true, pdf: true,  text: true };
    case 'openai':
    case 'openrouter':
    case 'ollama-cloud':
    case 'openai-compat':
      return { image: true, pdf: false, text: true };
    case 'groq':
    case 'mistral':
    case 'together':
    case 'ollama':
      // Most OpenAI-compatible local/cheap providers don't support vision.
      // Text-only attachments still work because they're inlined.
      return { image: false, pdf: false, text: true };
    default:
      return { image: true, pdf: false, text: true };
  }
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function readArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });
}

function readText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export async function readAttachment(file) {
  if (!file) throw new Error('No file');
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} is ${Math.round(file.size / 1024 / 1024)}MB — limit is 10MB.`);
  }
  const id = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const name = file.name || 'file';
  const type = file.type || '';
  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name);
  const isText = type.startsWith('text/') || type === 'application/json' || TEXT_EXT_RE.test(name);

  if (isImage) {
    const buf = await readArrayBuffer(file);
    return { id, name, kind: 'image', mediaType: type || 'image/png', dataB64: arrayBufferToBase64(buf), size: file.size };
  }
  if (isPdf) {
    const buf = await readArrayBuffer(file);
    return { id, name, kind: 'document', mediaType: 'application/pdf', dataB64: arrayBufferToBase64(buf), size: file.size };
  }
  if (isText) {
    const text = await readText(file);
    return { id, name, kind: 'text', mediaType: type || 'text/plain', text, size: file.size };
  }
  // Fallback: try as text (so users can still drop unknown formats)
  try {
    const text = await readText(file);
    if (text && text.length < 500_000) {
      return { id, name, kind: 'text', mediaType: type || 'application/octet-stream', text, size: file.size };
    }
  } catch {}
  throw new Error(`Unsupported file type: ${name} (${type || 'unknown'})`);
}

export function summarizeAttachments(atts = []) {
  if (!atts.length) return '';
  const groups = atts.reduce((acc, a) => { acc[a.kind] = (acc[a.kind] || 0) + 1; return acc; }, {});
  return Object.entries(groups).map(([k, n]) => `${n} ${k}${n > 1 ? 's' : ''}`).join(', ');
}
