import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    }
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

// Client-side Supabase instance for browser
export const supabaseClient = typeof window !== 'undefined'
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;

// Convenience alias for server-side
export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase();
    return client[prop];
  },
});

// Auth helpers (client-side)
export const auth = {
  signUp: async (email, password, metadata = {}) => {
    if (!supabaseClient) throw new Error('Supabase client not available');
    return supabaseClient.auth.signUp({ email, password, options: { data: metadata } });
  },

  signIn: async (email, password) => {
    if (!supabaseClient) throw new Error('Supabase client not available');
    return supabaseClient.auth.signInWithPassword({ email, password });
  },

  signOut: async () => {
    if (!supabaseClient) throw new Error('Supabase client not available');
    return supabaseClient.auth.signOut();
  },

  getSession: async () => {
    if (!supabaseClient) throw new Error('Supabase client not available');
    return supabaseClient.auth.getSession();
  },

  getUser: async () => {
    if (!supabaseClient) throw new Error('Supabase client not available');
    return supabaseClient.auth.getUser();
  },

  onAuthStateChange: (callback) => {
    if (!supabaseClient) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabaseClient.auth.onAuthStateChange(callback);
  },

  resetPassword: async (email) => {
    if (!supabaseClient) throw new Error('Supabase client not available');
    return supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  },
};

// Database helpers
export const db = {
  getProfile: (userId) =>
    supabase.from('profiles').select('*').eq('id', userId).single(),

  updateProfile: (userId, data) =>
    supabase.from('profiles').update(data).eq('id', userId).select().single(),

  getTransactions: (orgId) =>
    supabase.from('transactions').select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),

  createTransaction: (data) =>
    supabase.from('transactions').insert(data).select().single(),

  updateTransaction: (id, data) =>
    supabase.from('transactions').update(data).eq('id', id).select().single(),

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

  getDashboard: async (orgId) => {
    const [txnRes, profileRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('org_id', orgId),
      supabase.from('profiles').select('scan_count, scan_limit').eq('org_id', orgId).single(),
    ]);
    const transactions = txnRes.data || [];
    const profile = profileRes.data || {};
    const totalSpend = transactions
      .filter(t => t.txnType !== 'income')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const totalVat = transactions.reduce((s, t) => s + (parseFloat(t.vat) || 0), 0);
    const totalIncome = transactions
      .filter(t => t.txnType === 'income')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    return {
      totalSpend,
      totalVat,
      totalIncome,
      transactionCount: transactions.length,
      totalStored: transactions.length,
      scanCount: profile.scan_count || 0,
      scanLimit: profile.scan_limit || 50,
      recentTransactions: transactions.slice(0, 10),
    };
  },

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

  getFiles: (orgId) =>
    supabase.from('transactions').select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),

  editFile: (id, data) =>
    supabase.from('transactions').update(data).eq('id', id).select().single(),

  exportFiles: (orgId, filters = {}) => {
    let query = supabase.from('transactions').select('*').eq('org_id', orgId);
    if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('date', filters.dateTo);
    if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
    return query.order('date', { ascending: true });
  },

  uploadFile: async (orgId, file, fileName) => {
    const fileExt = fileName.split('.').pop();
    const filePath = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, { upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath);
    return { path: filePath, url: publicUrl };
  },

  createActivity: (data) =>
    supabase.from('activity').insert(data).select().single(),
};
