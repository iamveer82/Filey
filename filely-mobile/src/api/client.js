// API Configuration
// IMPORTANT: Update this URL to your deployed backend
const API_BASE = 'https://vat-tracker-ae.preview.emergentagent.com/api';

class ApiClient {
  async get(path, params = {}) {
    const url = new URL(`${API_BASE}/${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  }

  async post(path, body = {}) {
    const res = await fetch(`${API_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json();
  }

  async put(path, body = {}) {
    const res = await fetch(`${API_BASE}/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
    return res.json();
  }

  async delete(path) {
    const res = await fetch(`${API_BASE}/${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
    return res.json();
  }

  // Dashboard
  getDashboard() { return this.get('dashboard'); }

  // Chat
  sendMessage(message, sessionId) { return this.post('chat', { message, sessionId }); }
  scanReceipt(image, mimeType, sessionId) { return this.post('scan', { image, mimeType, sessionId }); }
  getChatSessions() { return this.get('chat/sessions'); }
  getChatMessages(sessionId) { return this.get('chat/messages', { sessionId }); }

  // Transactions
  getTransactions() { return this.get('transactions'); }
  createTransaction(data) { return this.post('transactions', data); }

  // Files
  getFiles(params = {}) { return this.get('files', params); }
  editFile(id, data) { return this.put('files/edit', { id, ...data }); }
  exportFiles(params = {}) { return this.get('files/export', params); }

  // Team
  getTeam() { return this.get('team'); }
  inviteMember(data) { return this.post('team/invite', data); }
  getTeamActivity() { return this.get('team/activity'); }
  getTeamChat() { return this.get('team/chat'); }
  sendTeamChat(message, userName) { return this.post('team/chat', { message, userName }); }

  // Settings
  getProfile() { return this.get('settings/profile'); }
  updateProfile(data) { return this.put('settings/profile', data); }
  updateAvatar(data) { return this.put('settings/avatar', data); }
  getCertificates() { return this.get('settings/certificates'); }
  uploadCertificate(data) { return this.post('settings/certificates', data); }
  deleteCertificate(id) { return this.delete(`settings/certificates?id=${id}`); }
  getReminders() { return this.get('settings/reminders'); }
  addReminder(data) { return this.post('settings/reminders', data); }
  deleteReminder(id) { return this.delete(`settings/reminders?id=${id}`); }
}

export default new ApiClient();
