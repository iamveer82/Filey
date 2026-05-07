import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Chunked SecureStore adapter.
 *
 * expo-secure-store has a ~2048-byte value limit on iOS. Supabase access tokens
 * (JWT + refresh token combined as JSON) routinely exceed this. Chunking splits
 * large values across multiple SecureStore keys so auth sessions survive on iOS.
 */
const CHUNK_SIZE = 1800;

const chunkedSecureStore = {
  async getItem(key) {
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__n`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        const chunks = await Promise.all(
          Array.from({ length: count }, (_, i) =>
            SecureStore.getItemAsync(`${key}__${i}`)
          )
        );
        if (chunks.some(c => c === null)) return null;
        return chunks.join('');
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItem(key, value) {
    try {
      if (value.length > CHUNK_SIZE) {
        const chunks = [];
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          chunks.push(value.slice(i, i + CHUNK_SIZE));
        }
        await Promise.all([
          SecureStore.setItemAsync(`${key}__n`, String(chunks.length)),
          ...chunks.map((chunk, i) =>
            SecureStore.setItemAsync(`${key}__${i}`, chunk)
          ),
        ]);
        await SecureStore.deleteItemAsync(key).catch(() => {});
      } else {
        await SecureStore.setItemAsync(key, value);
        await SecureStore.deleteItemAsync(`${key}__n`).catch(() => {});
      }
    } catch (e) {
      console.warn('[SecureStore] setItem failed:', e?.message);
    }
  },

  async removeItem(key) {
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__n`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        await Promise.all([
          SecureStore.deleteItemAsync(`${key}__n`),
          ...Array.from({ length: count }, (_, i) =>
            SecureStore.deleteItemAsync(`${key}__${i}`)
          ),
        ]);
      } else {
        await SecureStore.deleteItemAsync(key).catch(() => {});
      }
    } catch {}
  },
};

// Web uses localStorage; native uses chunked SecureStore
const ExpoSecureStoreAdapter = {
  getItem(key) {
    if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(key));
    return chunkedSecureStore.getItem(key);
  },
  setItem(key, value) {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return Promise.resolve(); }
    return chunkedSecureStore.setItem(key, value);
  },
  removeItem(key) {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return Promise.resolve(); }
    return chunkedSecureStore.removeItem(key);
  },
};

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Auth and database features will not work. Add them to your .env file.'
  );
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage:            ExpoSecureStoreAdapter,
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,
    },
  }
);

// ─── Auth helpers ─────────────────────────────────────────
export const auth = {
  signUp: (email, password, metadata = {}) =>
    supabase.auth.signUp({ email, password, options: { data: metadata } }),

  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  getUser: () => supabase.auth.getUser(),

  onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),

  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'filely://reset-password',
    }),
};

// ─── Database helpers (org-scoped) ────────────────────────
export const db = {
  // Profiles
  getProfile: (userId) =>
    supabase.from('profiles').select('*').eq('id', userId).single(),

  updateProfile: (userId, data) =>
    supabase.from('profiles').update(data).eq('id', userId).select().single(),

  // Transactions
  getTransactions: (orgId) =>
    supabase.from('transactions').select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),

  createTransaction: (data) =>
    supabase.from('transactions').insert(data).select().single(),

  updateTransaction: (id, data) =>
    supabase.from('transactions').update(data).eq('id', id).select().single(),

  // Chat
  getChatSessions: (orgId) =>
    supabase.from('chat_sessions').select('*')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false }),

  getChatMessages: (sessionId) =>
    supabase.from('messages').select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true }),

  createChatSession: (data) =>
    supabase.from('chat_sessions').insert(data).select().single(),

  createMessage: (data) =>
    supabase.from('messages').insert(data).select().single(),

  // Dashboard
  getDashboard: async (orgId) => {
    const [txnRes, profileRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('org_id', orgId),
      supabase.from('profiles').select('scan_count, scan_limit').eq('org_id', orgId).single(),
    ]);
    const transactions = txnRes.data || [];
    const profile      = profileRes.data || {};
    const totalSpend   = transactions.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const totalVat     = transactions.reduce((s, t) => s + (parseFloat(t.vat)    || 0), 0);
    return {
      totalSpend,
      totalVat,
      transactionCount: transactions.length,
      totalStored:      transactions.length,
      scanCount:        profile.scan_count  || 0,
      scanLimit:        profile.scan_limit  || 50,
      recentTransactions: transactions.slice(0, 5),
    };
  },

  // Team
  getTeam: (orgId) =>
    supabase.from('teams').select('*').eq('org_id', orgId).single(),

  inviteMember: (orgId, data) =>
    supabase.from('teams').update({ members: data }).eq('org_id', orgId).select().single(),

  getTeamActivity: (orgId) =>
    supabase.from('activity').select('*')
      .eq('org_id', orgId)
      .order('timestamp', { ascending: false }),

  getTeamChat: (orgId) =>
    supabase.from('team_chat').select('*')
      .eq('org_id', orgId)
      .order('timestamp', { ascending: true }),

  sendTeamChat: (data) =>
    supabase.from('team_chat').insert(data).select().single(),

  // Files
  getFiles: (orgId) =>
    supabase.from('transactions').select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),

  editFile: (id, data) =>
    supabase.from('transactions').update(data).eq('id', id).select().single(),

  exportFiles: (orgId, filters = {}) => {
    let query = supabase.from('transactions').select('*').eq('org_id', orgId);
    if (filters.dateFrom)                      query = query.gte('date', filters.dateFrom);
    if (filters.dateTo)                        query = query.lte('date', filters.dateTo);
    if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
    return query.order('date', { ascending: true });
  },

  // Certificates
  getCertificates: (orgId) =>
    supabase.from('certificates').select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),

  uploadCertificate: (data) =>
    supabase.from('certificates').insert(data).select().single(),

  deleteCertificate: (id) =>
    supabase.from('certificates').delete().eq('id', id),

  // Reminders
  getReminders: (orgId) =>
    supabase.from('reminders').select('*').eq('org_id', orgId),

  createReminder: (data) =>
    supabase.from('reminders').insert(data).select().single(),

  deleteReminder: (id) =>
    supabase.from('reminders').delete().eq('id', id),

  // Activity log
  createActivity: (data) =>
    supabase.from('activity').insert(data).select().single(),

  // Projects / client bill-back (C3)
  listProjects: (orgId) =>
    supabase.from('projects').select('*').eq('org_id', orgId).eq('archived', false),
  upsertProject: (data) =>
    supabase.from('projects').upsert(data).select().single(),
  archiveProject: (id) =>
    supabase.from('projects').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', id),

  // OOO delegation (C3)
  getDeputy: (managerId) =>
    supabase.from('deputies').select('*').eq('manager_id', managerId).maybeSingle(),
  setDeputy: (data) =>
    supabase.from('deputies').upsert(data).select().single(),
  clearDeputy: (managerId) =>
    supabase.from('deputies').delete().eq('manager_id', managerId),

  // Referral (C5)
  getReferralCode: (userId) =>
    supabase.from('referral_codes').select('code').eq('user_id', userId).maybeSingle(),
  saveReferralCode: (userId, code) =>
    supabase.from('referral_codes').upsert({ user_id: userId, code }).select().single(),
  findReferralOwner: (code) =>
    supabase.from('referral_codes').select('user_id').eq('code', code).maybeSingle(),
  recordRedemption: (redeemerId, code, grantedUntil) =>
    supabase.from('referral_redemptions')
      .insert({ redeemer_id: redeemerId, code, granted_until: grantedUntil })
      .select().single(),
  getPremiumCredits: (userId) =>
    supabase.from('premium_credits').select('premium_until').eq('user_id', userId).maybeSingle(),
  upsertPremiumCredits: (userId, premiumUntil) =>
    supabase.from('premium_credits')
      .upsert({ user_id: userId, premium_until: premiumUntil, updated_at: new Date().toISOString() })
      .select().single(),

  // Public share links (C5)
  createShareLink: (data) =>
    supabase.from('share_links').insert(data).select().single(),
  listShareLinks: (orgId) =>
    supabase.from('share_links').select('*')
      .eq('org_id', orgId).eq('revoked', false)
      .order('created_at', { ascending: false }),
  revokeShareLink: (id) =>
    supabase.from('share_links').update({ revoked: true }).eq('id', id),
  resolveShareToken: (token) =>
    supabase.from('share_links').select('*').eq('token', token).maybeSingle(),

  // Receipt version audit (C1)
  appendTxVersion: (data) =>
    supabase.from('tx_versions').insert(data).select().single(),
  listTxVersions: (txId) =>
    supabase.from('tx_versions').select('*').eq('tx_id', txId).order('ts', { ascending: true }),
};
