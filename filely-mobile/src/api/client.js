/**
 * Filely API Client
 *
 * Security hardening:
 * - 15-second timeout on every request via AbortController
 * - 401/403 responses emit a custom event so AuthContext can log the user out
 * - No silent swallowing of HTTP errors — callers receive structured error info
 */

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://vat-tracker-ae.preview.emergentagent.com') + '/api';
const TIMEOUT_MS = 15_000;

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

class ApiClient {
  async _request(method, path, body, params) {
    const url = new URL(`${API_BASE}/${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      });
    }

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetchWithTimeout(url.toString(), options);

      // Auth failure — signal AuthContext to log out
      if (res.status === 401 || res.status === 403) {
        if (typeof globalThis.__onAuthFailure === 'function') {
          globalThis.__onAuthFailure();
        }
        throw new Error('Session expired. Please sign in again.');
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API error ${res.status}: ${text.slice(0, 120)}`);
      }

      return res.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
      throw e;
    }
  }

  get(path, params)    { return this._request('GET',    path, null, params); }
  post(path, body)     { return this._request('POST',   path, body); }
  put(path, body)      { return this._request('PUT',    path, body); }
  delete(path)         { return this._request('DELETE', path); }

  // ── Dashboard ──────────────────────────────────────────
  getDashboard() { return this.get('dashboard'); }

  // ── Chat ───────────────────────────────────────────────
  sendMessage(message, sessionId) { return this.post('chat', { message, sessionId }); }
  scanReceipt(image, mimeType, sessionId) { return this.post('scan', { image, mimeType, sessionId }); }
  getChatSessions() { return this.get('chat/sessions'); }
  getChatMessages(sessionId) { return this.get('chat/messages', { sessionId }); }

  // ── Transactions ───────────────────────────────────────
  getTransactions() { return this.get('transactions'); }
  createTransaction(data) { return this.post('transactions', data); }

  // ── Files ──────────────────────────────────────────────
  getFiles(params = {}) { return this.get('files', params); }
  editFile(id, data) { return this.put('files/edit', { id, ...data }); }
  exportFiles(params = {}) { return this.get('files/export', params); }

  // ── Team ───────────────────────────────────────────────
  getTeam() { return this.get('team'); }
  inviteMember(data) { return this.post('team/invite', data); }
  getTeamActivity() { return this.get('team/activity'); }
  getTeamChat() { return this.get('team/chat'); }
  sendTeamChat(message, userName) { return this.post('team/chat', { message, userName }); }

  // ── Settings ───────────────────────────────────────────
  getProfile() { return this.get('settings/profile'); }
  updateProfile(data) { return this.put('settings/profile', data); }
  updateCompanyProfile(data) { return this.put('settings/company', data); }
  getCertificates() { return this.get('settings/certificates'); }
  uploadCertificate(data) { return this.post('settings/certificates', data); }
  deleteCertificate(id) { return this.delete(`settings/certificates?id=${id}`); }
}

export default new ApiClient();
