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

    // ============ FILES VAULT ============
    if (routePath === 'files' && method === 'GET') return getFiles(request);
    if (routePath === 'files/rename' && method === 'PUT') return renameFile(request);
    if (routePath === 'files/export' && method === 'GET') return exportData(request);

    // ============ TEAM CHAT ============
    if (routePath === 'team/chat' && method === 'GET') return getTeamChat(request);
    if (routePath === 'team/chat' && method === 'POST') return sendTeamChat(request);

    return jsonResponse({ error: 'Not found', path: routePath }, 404);
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}

// System prompt
const SYSTEM_PROMPT = `You are Filely AI, a UAE finance assistant. Track expenses in AED with 5% VAT.

When user describes a transaction, respond with JSON then a brief message:
\`\`\`json
{"type":"transaction","merchant":"","date":"","amount":0,"currency":"AED","vat":0,"category":"","payment_method":"","description":"","tagged_person":""}
\`\`\`
Categories: Food, Transport, Office, Utilities, Entertainment, Shopping, Health, Travel, General
VAT = amount * 0.05. Today is ${new Date().toISOString().split('T')[0]}. Be brief and friendly with emojis.`;

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

    const chatHistory = history.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
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
        if (extractedTransaction.amount && !extractedTransaction.vat) {
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

  const transaction = {
    id: body.id || uuidv4(),
    orgId: body.orgId || 'default',
    userId: body.userId || 'admin',
    merchant: body.merchant || 'Unknown',
    date: body.date || new Date().toISOString().split('T')[0],
    amount: parseFloat(body.amount) || 0,
    currency: body.currency || 'AED',
    vat: parseFloat(body.vat) || 0,
    trn: body.trn || '',
    category: body.category || 'General',
    payment_method: body.payment_method || 'Cash',
    description: body.description || '',
    tagged_person: body.tagged_person || '',
    status: 'verified',
    createdAt: new Date().toISOString(),
  };

  await db.collection('transactions').insertOne(transaction);

  await db.collection('activity').insertOne({
    id: uuidv4(),
    orgId: transaction.orgId,
    userId: transaction.tagged_person || transaction.userId,
    type: 'transaction',
    description: `${transaction.tagged_person || transaction.userId} added: ${transaction.merchant} - ${transaction.amount} ${transaction.currency}`,
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

  const totalSpend = monthly.reduce((s, t) => s + (t.amount || 0), 0);
  const totalVat = monthly.reduce((s, t) => s + (t.vat || 0), 0);

  const categories = {};
  monthly.forEach(t => { categories[t.category || 'General'] = (categories[t.category || 'General'] || 0) + (t.amount || 0); });

  const recentActivity = await db.collection('activity').find({ orgId }).sort({ timestamp: -1 }).limit(10).toArray();

  return jsonResponse({
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    transactionCount: monthly.length,
    categories,
    recentTransactions: transactions.slice(0, 5),
    recentActivity,
    scanCount: monthly.length,
    scanLimit: 10,
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

async function renameFile(request) {
  const body = await request.json();
  const db = await getDb();
  const { id, customName } = body;

  if (!id || !customName) return jsonResponse({ error: 'id and customName required' }, 400);

  await db.collection('transactions').updateOne(
    { id },
    { $set: { customName, updatedAt: new Date().toISOString() } }
  );
  return jsonResponse({ message: 'File renamed successfully', customName });
}

async function exportData(request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const query = { orgId };
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }

  const transactions = await db.collection('transactions').find(query).sort({ date: 1 }).toArray();

  const subtotal = transactions.reduce((s, t) => s + (t.amount || 0), 0);
  const totalVat = transactions.reduce((s, t) => s + (t.vat || 0), 0);
  const grandTotal = subtotal;

  const reportId = `FLD-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9999)}`;

  return jsonResponse({
    reportId,
    generatedAt: new Date().toISOString(),
    dateRange: { from: dateFrom || 'All', to: dateTo || 'All' },
    transactions: transactions.map(t => ({
      date: t.date,
      merchant: t.customName || t.merchant,
      vat: t.vat || 0,
      amount: t.amount || 0,
      category: t.category,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
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
