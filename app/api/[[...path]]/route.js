import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORE (replaces MongoDB for demo) ============
const store = {
  messages: [],
  chat_sessions: [],
  transactions: [],
  activity: [],
  teams: [],
  profiles: [],
  certificates: [],
  reminders: [],
  team_chat: [],
};

// Cloudflare Workers AI
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_MODEL = '@cf/google/gemma-3-12b-it';

async function callCloudflareAI(messages) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    }
  );
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Cloudflare AI request failed');
  }
  return data.result.response;
}

// CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

// Route handler
async function handler(request, { params }) {
  const { path } = params || {};
  const routePath = path ? path.join('/') : '';
  const method = request.method;

  try {
    if (routePath === 'health' && method === 'GET') {
      return jsonResponse({ status: 'ok', app: 'Filely - UAE Finance Tracker' });
    }
    if (routePath === 'chat' && method === 'POST') return handleChat(request);
    if (routePath === 'scan' && method === 'POST') return handleScan(request);
    if (routePath === 'chat/sessions' && method === 'GET') return getChatSessions(request);
    if (routePath === 'chat/messages' && method === 'GET') return getChatMessages(request);
    if (routePath === 'transactions' && method === 'GET') return getTransactions(request);
    if (routePath === 'transactions' && method === 'POST') return createTransaction(request);
    if (routePath === 'dashboard' && method === 'GET') return getDashboard(request);
    if (routePath === 'team' && method === 'GET') return getTeam(request);
    if (routePath === 'team/invite' && method === 'POST') return inviteTeamMember(request);
    if (routePath === 'team/activity' && method === 'GET') return getTeamActivity(request);
    if (routePath === 'settings/profile' && method === 'GET') return getProfile(request);
    if (routePath === 'settings/profile' && method === 'PUT') return updateProfile(request);
    if (routePath === 'settings/avatar' && method === 'PUT') return updateAvatar(request);
    if (routePath === 'settings/certificates' && method === 'GET') return getCertificates(request);
    if (routePath === 'settings/certificates' && method === 'POST') return addCertificate(request);
    if (routePath === 'settings/certificates' && method === 'DELETE') return deleteCertificate(request);
    if (routePath === 'settings/reminders' && method === 'GET') return getReminders(request);
    if (routePath === 'settings/reminders' && method === 'POST') return addReminder(request);
    if (routePath === 'settings/reminders' && method === 'DELETE') return deleteReminder(request);

    // ============ FILES VAULT ============
    if (routePath === 'files' && method === 'GET') return getFiles(request);
    if (routePath === 'files/edit' && method === 'PUT') return editFile(request);
    if (routePath === 'files/export' && method === 'GET') return exportData(request);
    if (routePath === 'files/history' && method === 'GET') return getEditHistory(request);

    // ============ TEAM CHAT ============
    if (routePath === 'team/chat' && method === 'GET') return getTeamChat(request);
    if (routePath === 'team/chat' && method === 'POST') return sendTeamChat(request);

    // ============ AUTH (stub for demo) ============
    if (routePath === 'auth/login' && method === 'POST') {
      return jsonResponse({ token: 'demo-token', user: { id: 'admin', orgId: 'default', name: 'Demo User', email: 'demo@filely.ae' } });
    }
    if (routePath === 'auth/signup' && method === 'POST') {
      return jsonResponse({ token: 'demo-token', user: { id: 'admin', orgId: 'default', name: 'Demo User', email: 'demo@filely.ae' } });
    }

    return jsonResponse({ error: 'Not found', path: routePath }, 404);
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}

// System prompt - built from in-memory transactions
function buildSystemPrompt(orgId) {
  const recentTxns = store.transactions
    .filter(t => t.orgId === orgId)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 20);

  const categoryLatest = {};
  recentTxns.forEach(t => {
    const cat = t.category || 'General';
    if (!categoryLatest[cat]) {
      categoryLatest[cat] = { merchant: t.customName || t.merchant, amount: t.amount, date: t.date, vat: t.vat, payment_method: t.payment_method, txnType: t.txnType || 'expense' };
    }
  });

  const txnContext = Object.entries(categoryLatest).map(([cat, t]) =>
    `${cat}: ${t.merchant} - ${t.amount} AED (${t.txnType}) on ${t.date}`
  ).join('\n');

  const allTxnList = recentTxns.slice(0, 10).map(t =>
    `- ${t.customName || t.merchant}: ${t.amount} AED, ${t.category}, ${t.txnType || 'expense'}, ${t.date}`
  ).join('\n');

  const expenses = recentTxns.filter(t => (t.txnType || 'expense') === 'expense');
  const incomes = recentTxns.filter(t => t.txnType === 'income');
  const totalExpenses = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const totalIncome = incomes.reduce((s, t) => s + (t.amount || 0), 0);
  const cashReceived = incomes.filter(t => t.incomeMode === 'cash').reduce((s, t) => s + (t.amount || 0), 0);
  const accountReceived = incomes.filter(t => t.incomeMode === 'account').reduce((s, t) => s + (t.amount || 0), 0);

  return `You are Filely AI, a UAE finance assistant. Track expenses AND income in AED.
IMPORTANT VAT RULE: 5% VAT applies ONLY to card/bank payments. Cash payments have ZERO VAT (vat=0). If the user says "cash" or payment_method is "Cash", always set vat to 0.

EXPENSES: When user describes spending/paying, respond with:
\`\`\`json
{"type":"transaction","txnType":"expense","merchant":"","date":"","amount":0,"currency":"AED","vat":0,"category":"","payment_method":"","description":"","tagged_person":""}
\`\`\`

INCOME/RECEIVED: When user says they RECEIVED money, got paid, or someone paid them, respond with:
\`\`\`json
{"type":"transaction","txnType":"income","merchant":"","date":"","amount":0,"currency":"AED","vat":0,"category":"Income","payment_method":"","incomeMode":"cash","description":"","tagged_person":""}
\`\`\`
incomeMode must be "cash" or "account" based on context. If user says "received in cash" → cash. "bank transfer"/"account"/"deposited" → account. Default to "account" if unclear.

Categories for expenses: Food, Transport, Office, Utilities, Entertainment, Shopping, Health, Travel, Banking, General
Category for income: Income
VAT RULES: Cash payments → vat=0 always. Card/bank payments → vat = amount * 0.05. Income → vat=0 always. Today is ${new Date().toISOString().split('T')[0]}.

LOOKUPS: When user asks about specific category/bill, look up data below. No JSON for lookups.

BALANCE CONTEXT:
- Total Expenses: ${totalExpenses} AED
- Total Income: ${totalIncome} AED (Cash: ${cashReceived}, Account: ${accountReceived})
- Net Balance: ${totalIncome - totalExpenses} AED

=== LATEST PER CATEGORY ===
${txnContext || 'No transactions yet.'}

=== RECENT ===
${allTxnList || 'No transactions yet.'}

Be brief and friendly with emojis.`;
}

// ============ CHAT ============
async function handleChat(request) {
  const body = await request.json();
  const { message, sessionId, orgId = 'default', userId = 'admin' } = body;

  if (!message) return jsonResponse({ error: 'Message is required' }, 400);

  const chatSessionId = sessionId || uuidv4();

  // Save user message in memory
  store.messages.push({
    id: uuidv4(), sessionId: chatSessionId, orgId, userId,
    role: 'user', content: message, timestamp: new Date().toISOString(),
  });

  // Get history from memory
  const history = store.messages
    .filter(m => m.sessionId === chatSessionId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-10);

  try {
    const systemPrompt = buildSystemPrompt(orgId);

    const cfMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const aiText = await callCloudflareAI(cfMessages);

    // Extract transaction JSON
    let extractedTransaction = null;
    const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        extractedTransaction = JSON.parse(jsonMatch[1]);
        const isCash = (extractedTransaction.payment_method || '').toLowerCase() === 'cash';
        if (extractedTransaction.txnType === 'income' || isCash) {
          extractedTransaction.vat = 0;
        } else if (extractedTransaction.amount && !extractedTransaction.vat) {
          extractedTransaction.vat = Math.round(extractedTransaction.amount * 0.05 * 100) / 100;
        }
        if (!extractedTransaction.date) {
          extractedTransaction.date = new Date().toISOString().split('T')[0];
        }
        extractedTransaction.id = uuidv4();
        extractedTransaction.status = 'pending';
      } catch (e) { console.error('JSON parse error:', e); }
    }

    const cleanText = aiText.replace(/```json[\s\S]*?```/g, '').trim();

    // Save AI message in memory
    const aiMsg = {
      id: uuidv4(), sessionId: chatSessionId, orgId, userId: 'ai',
      role: 'assistant', content: cleanText, extractedTransaction,
      timestamp: new Date().toISOString(),
    };
    store.messages.push(aiMsg);

    // Update session in memory
    const existingSession = store.chat_sessions.find(s => s.sessionId === chatSessionId);
    if (existingSession) {
      existingSession.lastMessage = message.substring(0, 100);
      existingSession.updatedAt = new Date().toISOString();
    } else {
      store.chat_sessions.push({
        sessionId: chatSessionId, orgId, userId,
        lastMessage: message.substring(0, 100),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return jsonResponse({
      sessionId: chatSessionId, message: cleanText,
      extractedTransaction, timestamp: aiMsg.timestamp,
    });
  } catch (error) {
    console.error('AI error:', error);
    return jsonResponse({ error: 'AI processing failed: ' + error.message }, 500);
  }
}

// ============ RECEIPT SCAN ============
async function handleScan(request) {
  const body = await request.json();
  const { image, mimeType = 'image/jpeg', sessionId, orgId = 'default', userId = 'admin' } = body;

  if (!image) return jsonResponse({ error: 'Image (base64) is required' }, 400);

  const chatSessionId = sessionId || uuidv4();

  store.messages.push({
    id: uuidv4(), sessionId: chatSessionId, orgId, userId,
    role: 'user', content: '[Receipt Image Uploaded]', hasImage: true,
    timestamp: new Date().toISOString(),
  });

  const scanPrompt = `Analyze this receipt and extract: Merchant, Date, TRN, Total Amount (AED), VAT (5%), Category, Payment method.
Respond with:
\`\`\`json
{"type":"transaction","merchant":"","date":"","trn":"","amount":0,"currency":"AED","vat":0,"category":"","payment_method":"","description":"","items":[]}
\`\`\`
Then a brief summary. Today is ${new Date().toISOString().split('T')[0]}.`;

  try {
    const cfMessages = [
      { role: 'system', content: 'You are a receipt analysis AI. Extract data from receipt descriptions accurately.' },
      { role: 'user', content: `${scanPrompt}\n\n[Receipt image provided - base64 ${mimeType}]` },
    ];

    const aiText = await callCloudflareAI(cfMessages);

    let extractedTransaction = null;
    const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        extractedTransaction = JSON.parse(jsonMatch[1]);
        extractedTransaction.id = uuidv4();
        extractedTransaction.status = 'pending';
        if (!extractedTransaction.date) {
          extractedTransaction.date = new Date().toISOString().split('T')[0];
        }
      } catch (e) { console.error('Scan JSON error:', e); }
    }

    const cleanText = aiText.replace(/```json[\s\S]*?```/g, '').trim();

    const aiMsg = {
      id: uuidv4(), sessionId: chatSessionId, orgId, userId: 'ai',
      role: 'assistant', content: cleanText, extractedTransaction,
      timestamp: new Date().toISOString(),
    };
    store.messages.push(aiMsg);

    const existingSession = store.chat_sessions.find(s => s.sessionId === chatSessionId);
    if (existingSession) {
      existingSession.lastMessage = 'Receipt scanned';
      existingSession.updatedAt = new Date().toISOString();
    } else {
      store.chat_sessions.push({
        sessionId: chatSessionId, orgId, userId,
        lastMessage: 'Receipt scanned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return jsonResponse({
      sessionId: chatSessionId, message: cleanText,
      extractedTransaction, timestamp: aiMsg.timestamp,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return jsonResponse({ error: 'Receipt scanning failed: ' + error.message }, 500);
  }
}

// ============ CHAT SESSIONS ============
async function getChatSessions(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const sessions = store.chat_sessions
    .filter(s => s.orgId === orgId)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 20);
  return jsonResponse({ sessions });
}

async function getChatMessages(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return jsonResponse({ error: 'sessionId required' }, 400);
  const messages = store.messages
    .filter(m => m.sessionId === sessionId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return jsonResponse({ messages });
}

// ============ TRANSACTIONS ============
async function getTransactions(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const transactions = store.transactions
    .filter(t => t.orgId === orgId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 50);
  return jsonResponse({ transactions });
}

async function createTransaction(request) {
  const body = await request.json();

  const txnType = body.txnType || 'expense';
  const transaction = {
    id: body.id || uuidv4(),
    orgId: body.orgId || 'default',
    userId: body.userId || 'admin',
    merchant: body.merchant || 'Unknown',
    date: body.date || new Date().toISOString().split('T')[0],
    amount: parseFloat(body.amount) || 0,
    currency: body.currency || 'AED',
    vat: (txnType === 'income' || (body.payment_method || '').toLowerCase() === 'cash') ? 0 : (parseFloat(body.vat) || 0),
    trn: body.trn || '',
    category: body.category || (txnType === 'income' ? 'Income' : 'General'),
    payment_method: body.payment_method || 'Cash',
    description: body.description || '',
    tagged_person: body.tagged_person || '',
    txnType,
    incomeMode: body.incomeMode || (txnType === 'income' ? 'account' : ''),
    status: 'verified',
    createdAt: new Date().toISOString(),
  };

  store.transactions.push(transaction);

  const actionWord = txnType === 'income' ? 'received' : 'added';
  store.activity.push({
    id: uuidv4(),
    orgId: transaction.orgId,
    userId: transaction.tagged_person || transaction.userId,
    type: 'transaction',
    description: `${transaction.tagged_person || transaction.userId} ${actionWord}: ${transaction.merchant} - ${transaction.amount} ${transaction.currency}${txnType === 'income' ? ` (${transaction.incomeMode})` : ''}`,
    category: transaction.category,
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({ transaction, message: 'Transaction saved!' });
}

// ============ DASHBOARD ============
async function getDashboard(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const transactions = store.transactions
    .filter(t => t.orgId === orgId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const monthly = transactions.filter(t => t.createdAt >= startOfMonth);

  const expenses = monthly.filter(t => (t.txnType || 'expense') === 'expense');
  const incomes = monthly.filter(t => t.txnType === 'income');

  const totalSpend = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const totalVat = expenses.reduce((s, t) => s + (t.vat || 0), 0);
  const totalIncome = incomes.reduce((s, t) => s + (t.amount || 0), 0);
  const cashReceived = incomes.filter(t => t.incomeMode === 'cash').reduce((s, t) => s + (t.amount || 0), 0);
  const accountReceived = incomes.filter(t => t.incomeMode === 'account').reduce((s, t) => s + (t.amount || 0), 0);

  const categories = {};
  monthly.forEach(t => { categories[t.category || 'General'] = (categories[t.category || 'General'] || 0) + (t.amount || 0); });

  const recentActivity = store.activity
    .filter(a => a.orgId === orgId)
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, 10);

  return jsonResponse({
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    cashReceived: Math.round(cashReceived * 100) / 100,
    accountReceived: Math.round(accountReceived * 100) / 100,
    balance: Math.round((totalIncome - totalSpend) * 100) / 100,
    transactionCount: monthly.length,
    expenseCount: expenses.length,
    incomeCount: incomes.length,
    categories,
    recentTransactions: transactions.slice(0, 5),
    recentActivity,
    scanCount: expenses.length,
    scanLimit: 50,
    plan: 'basic',
  });
}

// ============ TEAM ============
async function getTeam(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  let team = store.teams.find(t => t.orgId === orgId);
  if (!team) {
    team = {
      id: uuidv4(), orgId, name: 'My Organization',
      admin: { id: 'admin', name: 'Admin', email: 'admin@filely.ae', role: 'admin' },
      members: [], createdAt: new Date().toISOString(),
    };
    store.teams.push(team);
  }
  return jsonResponse({ team });
}

async function inviteTeamMember(request) {
  const body = await request.json();
  const { orgId = 'default', name, email, role = 'member' } = body;

  if (!name || !email) return jsonResponse({ error: 'Name and email are required' }, 400);

  const member = { id: uuidv4(), name, email, role, joinedAt: new Date().toISOString() };

  let team = store.teams.find(t => t.orgId === orgId);
  if (!team) {
    team = {
      id: uuidv4(), orgId, name: 'My Organization',
      admin: { id: 'admin', name: 'Admin', email: 'admin@filely.ae', role: 'admin' },
      members: [], createdAt: new Date().toISOString(),
    };
    store.teams.push(team);
  }
  team.members.push(member);
  team.updatedAt = new Date().toISOString();

  store.activity.push({
    id: uuidv4(), orgId, userId: 'admin', type: 'team',
    description: `Invited ${name} (${role}) to the team`,
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({ member, message: `${name} has been invited!` });
}

async function getTeamActivity(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const activity = store.activity
    .filter(a => a.orgId === orgId)
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, 20);
  return jsonResponse({ activity });
}

// ============ SETTINGS ============
async function getProfile(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  let profile = store.profiles.find(p => p.orgId === orgId);
  if (!profile) {
    profile = {
      id: uuidv4(), orgId, name: 'User', email: 'user@filely.ae',
      company: 'My Company', plan: 'basic', scanCount: 0, scanLimit: 10,
      createdAt: new Date().toISOString(),
    };
    store.profiles.push(profile);
  }
  return jsonResponse({ profile });
}

async function updateProfile(request) {
  const body = await request.json();
  const { orgId = 'default' } = body;

  let profile = store.profiles.find(p => p.orgId === orgId);
  if (!profile) {
    profile = { id: uuidv4(), orgId, createdAt: new Date().toISOString() };
    store.profiles.push(profile);
  }

  if (body.name) profile.name = body.name;
  if (body.email) profile.email = body.email;
  if (body.company) profile.company = body.company;
  profile.updatedAt = new Date().toISOString();

  return jsonResponse({ message: 'Profile updated!' });
}

// ============ AVATAR ============
async function updateAvatar(request) {
  const body = await request.json();
  const { orgId = 'default', avatar } = body;
  if (!avatar) return jsonResponse({ error: 'avatar (base64) required' }, 400);

  let profile = store.profiles.find(p => p.orgId === orgId);
  if (!profile) {
    profile = { id: uuidv4(), orgId, createdAt: new Date().toISOString() };
    store.profiles.push(profile);
  }
  profile.avatar = avatar;
  profile.updatedAt = new Date().toISOString();

  return jsonResponse({ message: 'Avatar updated!' });
}

// ============ CERTIFICATES ============
async function getCertificates(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const certs = store.certificates
    .filter(c => c.orgId === orgId)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return jsonResponse({ certificates: certs });
}

async function addCertificate(request) {
  const body = await request.json();
  const { orgId = 'default', name, file, mimeType = 'application/pdf' } = body;
  if (!name || !file) return jsonResponse({ error: 'name and file (base64) required' }, 400);
  const cert = { id: uuidv4(), orgId, name, file, mimeType, createdAt: new Date().toISOString() };
  store.certificates.push(cert);
  return jsonResponse({ certificate: { id: cert.id, name: cert.name, mimeType: cert.mimeType, createdAt: cert.createdAt } });
}

async function deleteCertificate(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id required' }, 400);
  const idx = store.certificates.findIndex(c => c.id === id);
  if (idx !== -1) store.certificates.splice(idx, 1);
  return jsonResponse({ message: 'Certificate deleted' });
}

// ============ REMINDERS ============
async function getReminders(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  let reminders = store.reminders.filter(r => r.orgId === orgId).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  if (reminders.length === 0) {
    const defaults = [
      { id: uuidv4(), orgId, time: '10:00', label: '10:00 AM', createdAt: new Date().toISOString() },
      { id: uuidv4(), orgId, time: '18:00', label: '06:00 PM', createdAt: new Date().toISOString() },
    ];
    store.reminders.push(...defaults);
    reminders = defaults;
  }
  return jsonResponse({ reminders });
}

async function addReminder(request) {
  const body = await request.json();
  const { orgId = 'default', time } = body;
  if (!time) return jsonResponse({ error: 'time required (HH:MM)' }, 400);
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const label = `${hour > 12 ? String(hour - 12).padStart(2, '0') : h}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  const reminder = { id: uuidv4(), orgId, time, label, createdAt: new Date().toISOString() };
  store.reminders.push(reminder);
  return jsonResponse({ reminder });
}

async function deleteReminder(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id required' }, 400);
  const idx = store.reminders.findIndex(r => r.id === id);
  if (idx !== -1) store.reminders.splice(idx, 1);
  return jsonResponse({ message: 'Reminder deleted' });
}

// ============ FILES VAULT ============
async function getFiles(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const amountMin = parseFloat(searchParams.get('amountMin') || '0');
  const amountMax = parseFloat(searchParams.get('amountMax') || '999999');

  let files = store.transactions.filter(t => t.orgId === orgId);
  if (dateFrom) files = files.filter(t => t.date >= dateFrom);
  if (dateTo) files = files.filter(t => t.date <= dateTo);
  if (amountMin > 0) files = files.filter(t => (t.amount || 0) >= amountMin);
  if (amountMax < 999999) files = files.filter(t => (t.amount || 0) <= amountMax);

  files.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return jsonResponse({ files, total: files.length });
}

async function editFile(request) {
  const body = await request.json();
  const { id, merchant, category, amount, editedBy = 'admin' } = body;

  if (!id) return jsonResponse({ error: 'id required' }, 400);

  const current = store.transactions.find(t => t.id === id);
  if (!current) return jsonResponse({ error: 'Transaction not found' }, 404);

  const changes = [];
  if (merchant !== undefined && merchant !== (current.customName || current.merchant)) {
    changes.push({ field: 'name', from: current.customName || current.merchant, to: merchant });
    current.customName = merchant;
  }
  if (category !== undefined && category !== current.category) {
    changes.push({ field: 'category', from: current.category, to: category });
    current.category = category;
  }
  if (amount !== undefined && parseFloat(amount) !== current.amount) {
    const newAmount = parseFloat(amount);
    changes.push({ field: 'amount', from: current.amount, to: newAmount });
    current.amount = newAmount;
    current.vat = Math.round(newAmount * 0.05 * 100) / 100;
  }

  if (changes.length === 0) return jsonResponse({ message: 'No changes detected' });

  const historyEntry = {
    id: uuidv4(),
    transactionId: id,
    editedBy,
    changes,
    timestamp: new Date().toISOString(),
  };

  if (!current.editHistory) current.editHistory = [];
  current.editHistory.push(historyEntry);
  current.updatedAt = new Date().toISOString();

  const changeDesc = changes.map(c => `${c.field}: ${c.from} → ${c.to}`).join(', ');
  store.activity.push({
    id: uuidv4(),
    orgId: current.orgId || 'default',
    userId: editedBy,
    type: 'edit',
    description: `${editedBy} edited ${current.customName || current.merchant}: ${changeDesc}`,
    category: 'Edit',
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({ message: 'Transaction updated!', changes, historyEntry });
}

async function getEditHistory(request) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('id');

  if (!transactionId) return jsonResponse({ error: 'id required' }, 400);

  const txn = store.transactions.find(t => t.id === transactionId);
  if (!txn) return jsonResponse({ error: 'Not found' }, 404);

  return jsonResponse({ editHistory: (txn.editHistory || []).reverse() });
}

async function exportData(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const amountMin = parseFloat(searchParams.get('amountMin') || '0');
  const amountMax = parseFloat(searchParams.get('amountMax') || '999999');
  const category = searchParams.get('category');

  let transactions = store.transactions.filter(t => t.orgId === orgId);
  if (dateFrom) transactions = transactions.filter(t => t.date >= dateFrom);
  if (dateTo) transactions = transactions.filter(t => t.date <= dateTo);
  if (amountMin > 0) transactions = transactions.filter(t => (t.amount || 0) >= amountMin);
  if (amountMax < 999999) transactions = transactions.filter(t => (t.amount || 0) <= amountMax);
  if (category && category !== 'all') transactions = transactions.filter(t => t.category === category);

  transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const subtotal = transactions.reduce((s, t) => s + (t.amount || 0), 0);
  const totalVat = transactions.reduce((s, t) => s + (t.vat || 0), 0);

  const reportId = `FLD-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9999)}`;

  return jsonResponse({
    reportId,
    generatedAt: new Date().toISOString(),
    dateRange: { from: dateFrom || 'All', to: dateTo || 'All' },
    filters: { amountMin, amountMax, category: category || 'All' },
    transactions: transactions.map(t => ({
      id: t.id,
      date: t.date,
      merchant: t.customName || t.merchant,
      vat: t.vat || 0,
      amount: t.amount || 0,
      category: t.category,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    grandTotal: Math.round(subtotal * 100) / 100,
    transactionCount: transactions.length,
  });
}

// ============ TEAM CHAT ============
async function getTeamChat(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  const messages = store.team_chat
    .filter(m => m.orgId === orgId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(0, 50);
  return jsonResponse({ messages });
}

async function sendTeamChat(request) {
  const body = await request.json();
  const { orgId = 'default', userId = 'admin', userName = 'Admin', message } = body;

  if (!message) return jsonResponse({ error: 'Message required' }, 400);

  const chatMsg = {
    id: uuidv4(), orgId, userId, userName, message,
    timestamp: new Date().toISOString(),
  };
  store.team_chat.push(chatMsg);
  return jsonResponse({ chatMessage: chatMsg });
}

// Export handlers
export async function GET(request, context) { return handler(request, context); }
export async function POST(request, context) { return handler(request, context); }
export async function PUT(request, context) { return handler(request, context); }
export async function DELETE(request, context) { return handler(request, context); }
export async function OPTIONS(request) { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }
