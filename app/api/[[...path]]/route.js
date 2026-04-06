import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

// MongoDB connection
let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(process.env.DB_NAME || 'filely_db');
  return cachedDb;
}

// Gemini AI
function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

const AI_MODEL = 'gemini-2.5-flash-lite';

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

    return jsonResponse({ error: 'Not found', path: routePath }, 404);
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}

// System prompt - built dynamically with transaction context
async function buildSystemPrompt(db, orgId) {
  const recentTxns = await db.collection('transactions')
    .find({ orgId }).sort({ createdAt: -1 }).limit(20).toArray();

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

  // Calculate balance
  const expenses = recentTxns.filter(t => (t.txnType || 'expense') === 'expense');
  const incomes = recentTxns.filter(t => t.txnType === 'income');
  const totalExpenses = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const totalIncome = incomes.reduce((s, t) => s + (t.amount || 0), 0);
  const cashReceived = incomes.filter(t => t.incomeMode === 'cash').reduce((s, t) => s + (t.amount || 0), 0);
  const accountReceived = incomes.filter(t => t.incomeMode === 'account').reduce((s, t) => s + (t.amount || 0), 0);

  return `You are Filely AI, a UAE finance assistant. Track expenses AND income in AED with 5% VAT on expenses.

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
VAT = amount * 0.05 (only on expenses, vat=0 for income). Today is ${new Date().toISOString().split('T')[0]}.

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

  const db = await getDb();
  const chatSessionId = sessionId || uuidv4();

  // Save user message
  await db.collection('messages').insertOne({
    id: uuidv4(), sessionId: chatSessionId, orgId, userId,
    role: 'user', content: message, timestamp: new Date().toISOString(),
  });

  // Get history
  const history = await db.collection('messages')
    .find({ sessionId: chatSessionId })
    .sort({ timestamp: 1 }).limit(10).toArray();

  try {
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({ model: AI_MODEL });

    // Build dynamic system prompt with transaction context
    const systemPrompt = await buildSystemPrompt(db, orgId);

    const chatHistory = history.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Ready to track your UAE finances! Send me expenses or receipts.' }] },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const aiText = result.response.text();

    // Extract transaction JSON
    let extractedTransaction = null;
    const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        extractedTransaction = JSON.parse(jsonMatch[1]);
        // VAT only for expenses, not income
        if (extractedTransaction.txnType === 'income') {
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

    // Save AI message
    const aiMsg = {
      id: uuidv4(), sessionId: chatSessionId, orgId, userId: 'ai',
      role: 'assistant', content: cleanText, extractedTransaction,
      timestamp: new Date().toISOString(),
    };
    await db.collection('messages').insertOne(aiMsg);

    // Update session
    await db.collection('chat_sessions').updateOne(
      { sessionId: chatSessionId },
      {
        $set: { sessionId: chatSessionId, orgId, userId, lastMessage: message.substring(0, 100), updatedAt: new Date().toISOString() },
        $setOnInsert: { createdAt: new Date().toISOString() },
      },
      { upsert: true }
    );

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

  const db = await getDb();
  const chatSessionId = sessionId || uuidv4();

  await db.collection('messages').insertOne({
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
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({ model: AI_MODEL });

    const result = await model.generateContent([
      scanPrompt,
      { inlineData: { data: image, mimeType } },
    ]);

    const aiText = result.response.text();

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
    await db.collection('messages').insertOne(aiMsg);

    await db.collection('chat_sessions').updateOne(
      { sessionId: chatSessionId },
      {
        $set: { sessionId: chatSessionId, orgId, userId, lastMessage: 'Receipt scanned', updatedAt: new Date().toISOString() },
        $setOnInsert: { createdAt: new Date().toISOString() },
      },
      { upsert: true }
    );

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
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const sessions = await db.collection('chat_sessions').find({ orgId }).sort({ updatedAt: -1 }).limit(20).toArray();
  return jsonResponse({ sessions });
}

async function getChatMessages(request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return jsonResponse({ error: 'sessionId required' }, 400);
  const messages = await db.collection('messages').find({ sessionId }).sort({ timestamp: 1 }).toArray();
  return jsonResponse({ messages });
}

// ============ TRANSACTIONS ============
async function getTransactions(request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const transactions = await db.collection('transactions').find({ orgId }).sort({ date: -1 }).limit(50).toArray();
  return jsonResponse({ transactions });
}

async function createTransaction(request) {
  const body = await request.json();
  const db = await getDb();

  const txnType = body.txnType || 'expense';
  const transaction = {
    id: body.id || uuidv4(),
    orgId: body.orgId || 'default',
    userId: body.userId || 'admin',
    merchant: body.merchant || 'Unknown',
    date: body.date || new Date().toISOString().split('T')[0],
    amount: parseFloat(body.amount) || 0,
    currency: body.currency || 'AED',
    vat: txnType === 'income' ? 0 : (parseFloat(body.vat) || 0),
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

  await db.collection('transactions').insertOne(transaction);

  const actionWord = txnType === 'income' ? 'received' : 'added';
  await db.collection('activity').insertOne({
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
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const transactions = await db.collection('transactions').find({ orgId }).sort({ date: -1 }).toArray();
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

  const recentActivity = await db.collection('activity').find({ orgId }).sort({ timestamp: -1 }).limit(10).toArray();

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
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  let team = await db.collection('teams').findOne({ orgId });
  if (!team) {
    team = {
      id: uuidv4(), orgId, name: 'My Organization',
      admin: { id: 'admin', name: 'Admin', email: 'admin@filely.ae', role: 'admin' },
      members: [], createdAt: new Date().toISOString(),
    };
    await db.collection('teams').insertOne(team);
  }
  return jsonResponse({ team });
}

async function inviteTeamMember(request) {
  const body = await request.json();
  const db = await getDb();
  const { orgId = 'default', name, email, role = 'member' } = body;

  if (!name || !email) return jsonResponse({ error: 'Name and email are required' }, 400);

  const member = { id: uuidv4(), name, email, role, joinedAt: new Date().toISOString() };

  await db.collection('teams').updateOne(
    { orgId },
    {
      $push: { members: member },
      $set: { updatedAt: new Date().toISOString() },
      $setOnInsert: {
        id: uuidv4(), orgId, name: 'My Organization',
        admin: { id: 'admin', name: 'Admin', email: 'admin@filely.ae', role: 'admin' },
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  await db.collection('activity').insertOne({
    id: uuidv4(), orgId, userId: 'admin', type: 'team',
    description: `Invited ${name} (${role}) to the team`,
    timestamp: new Date().toISOString(),
  });

  return jsonResponse({ member, message: `${name} has been invited!` });
}

async function getTeamActivity(request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const activity = await db.collection('activity').find({ orgId }).sort({ timestamp: -1 }).limit(20).toArray();
  return jsonResponse({ activity });
}

// ============ SETTINGS ============
async function getProfile(request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  let profile = await db.collection('profiles').findOne({ orgId });
  if (!profile) {
    profile = {
      id: uuidv4(), orgId, name: 'User', email: 'user@filely.ae',
      company: 'My Company', plan: 'basic', scanCount: 0, scanLimit: 10,
      createdAt: new Date().toISOString(),
    };
    await db.collection('profiles').insertOne(profile);
  }
  return jsonResponse({ profile });
}

async function updateProfile(request) {
  const body = await request.json();
  const db = await getDb();
  const { orgId = 'default' } = body;

  const updateData = { updatedAt: new Date().toISOString() };
  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.company) updateData.company = body.company;

  await db.collection('profiles').updateOne({ orgId }, { $set: updateData }, { upsert: true });
  return jsonResponse({ message: 'Profile updated!' });
}

// ============ AVATAR ============
async function updateAvatar(request) {
  const body = await request.json();
  const db = await getDb();
  const { orgId = 'default', avatar } = body;
  if (!avatar) return jsonResponse({ error: 'avatar (base64) required' }, 400);
  await db.collection('profiles').updateOne({ orgId }, { $set: { avatar, updatedAt: new Date().toISOString() } }, { upsert: true });
  return jsonResponse({ message: 'Avatar updated!' });
}

// ============ CERTIFICATES ============
async function getCertificates(request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const certs = await db.collection('certificates').find({ orgId }).sort({ createdAt: -1 }).toArray();
  return jsonResponse({ certificates: certs });
}

async function addCertificate(request) {
  const body = await request.json();
  const db = await getDb();
  const { orgId = 'default', name, file, mimeType = 'application/pdf' } = body;
  if (!name || !file) return jsonResponse({ error: 'name and file (base64) required' }, 400);
  const cert = { id: uuidv4(), orgId, name, file, mimeType, createdAt: new Date().toISOString() };
  await db.collection('certificates').insertOne(cert);
  return jsonResponse({ certificate: { id: cert.id, name: cert.name, mimeType: cert.mimeType, createdAt: cert.createdAt } });
}

async function deleteCertificate(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id required' }, 400);
  const db = await getDb();
  await db.collection('certificates').deleteOne({ id });
  return jsonResponse({ message: 'Certificate deleted' });
}

// ============ REMINDERS ============
async function getReminders(request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  let reminders = await db.collection('reminders').find({ orgId }).sort({ time: 1 }).toArray();
  if (reminders.length === 0) {
    const defaults = [
      { id: uuidv4(), orgId, time: '10:00', label: '10:00 AM', createdAt: new Date().toISOString() },
      { id: uuidv4(), orgId, time: '18:00', label: '06:00 PM', createdAt: new Date().toISOString() },
    ];
    await db.collection('reminders').insertMany(defaults);
    reminders = defaults;
  }
  return jsonResponse({ reminders });
}

async function addReminder(request) {
  const body = await request.json();
  const db = await getDb();
  const { orgId = 'default', time } = body;
  if (!time) return jsonResponse({ error: 'time required (HH:MM)' }, 400);
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const label = `${hour > 12 ? String(hour - 12).padStart(2, '0') : h}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  const reminder = { id: uuidv4(), orgId, time, label, createdAt: new Date().toISOString() };
  await db.collection('reminders').insertOne(reminder);
  return jsonResponse({ reminder });
}

async function deleteReminder(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id required' }, 400);
  const db = await getDb();
  await db.collection('reminders').deleteOne({ id });
  return jsonResponse({ message: 'Reminder deleted' });
}

// ============ FILES VAULT ============
async function getFiles(request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const amountMin = parseFloat(searchParams.get('amountMin') || '0');
  const amountMax = parseFloat(searchParams.get('amountMax') || '999999');
  const type = searchParams.get('type') || 'all';

  const query = { orgId };
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }
  if (amountMin > 0 || amountMax < 999999) {
    query.amount = { $gte: amountMin, $lte: amountMax };
  }

  const files = await db.collection('transactions').find(query).sort({ createdAt: -1 }).toArray();
  return jsonResponse({ files, total: files.length });
}

async function editFile(request) {
  const body = await request.json();
  const db = await getDb();
  const { id, merchant, category, amount, editedBy = 'admin' } = body;

  if (!id) return jsonResponse({ error: 'id required' }, 400);

  // Get the current transaction first
  const current = await db.collection('transactions').findOne({ id });
  if (!current) return jsonResponse({ error: 'Transaction not found' }, 404);

  // Build update and history entry
  const changes = [];
  const update = { updatedAt: new Date().toISOString() };

  if (merchant !== undefined && merchant !== (current.customName || current.merchant)) {
    changes.push({ field: 'name', from: current.customName || current.merchant, to: merchant });
    update.customName = merchant;
  }
  if (category !== undefined && category !== current.category) {
    changes.push({ field: 'category', from: current.category, to: category });
    update.category = category;
  }
  if (amount !== undefined && parseFloat(amount) !== current.amount) {
    const newAmount = parseFloat(amount);
    changes.push({ field: 'amount', from: current.amount, to: newAmount });
    update.amount = newAmount;
    update.vat = Math.round(newAmount * 0.05 * 100) / 100;
  }

  if (changes.length === 0) return jsonResponse({ message: 'No changes detected' });

  // Create history entry
  const historyEntry = {
    id: uuidv4(),
    transactionId: id,
    editedBy,
    changes,
    timestamp: new Date().toISOString(),
  };

  // Update transaction and push to edit history
  await db.collection('transactions').updateOne(
    { id },
    {
      $set: update,
      $push: { editHistory: historyEntry },
    }
  );

  // Also log as activity
  const changeDesc = changes.map(c => `${c.field}: ${c.from} → ${c.to}`).join(', ');
  await db.collection('activity').insertOne({
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
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('id');

  if (!transactionId) return jsonResponse({ error: 'id required' }, 400);

  const txn = await db.collection('transactions').findOne({ id: transactionId });
  if (!txn) return jsonResponse({ error: 'Not found' }, 404);

  return jsonResponse({ editHistory: (txn.editHistory || []).reverse() });
}

async function exportData(request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const amountMin = parseFloat(searchParams.get('amountMin') || '0');
  const amountMax = parseFloat(searchParams.get('amountMax') || '999999');
  const category = searchParams.get('category');

  const query = { orgId };
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }
  if (amountMin > 0 || amountMax < 999999) {
    query.amount = { $gte: amountMin, $lte: amountMax };
  }
  if (category && category !== 'all') {
    query.category = category;
  }

  const transactions = await db.collection('transactions').find(query).sort({ date: -1 }).toArray();

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
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  const messages = await db.collection('team_chat')
    .find({ orgId }).sort({ timestamp: 1 }).limit(50).toArray();
  return jsonResponse({ messages });
}

async function sendTeamChat(request) {
  const body = await request.json();
  const db = await getDb();
  const { orgId = 'default', userId = 'admin', userName = 'Admin', message } = body;

  if (!message) return jsonResponse({ error: 'Message required' }, 400);

  const chatMsg = {
    id: uuidv4(), orgId, userId, userName, message,
    timestamp: new Date().toISOString(),
  };
  await db.collection('team_chat').insertOne(chatMsg);
  return jsonResponse({ chatMessage: chatMsg });
}

// Export handlers
export async function GET(request, context) { return handler(request, context); }
export async function POST(request, context) { return handler(request, context); }
export async function PUT(request, context) { return handler(request, context); }
export async function DELETE(request, context) { return handler(request, context); }
export async function OPTIONS(request) { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }
