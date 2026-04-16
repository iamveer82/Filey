import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { isCloudflareAIAvailable, chatWithFileyAI, parseReceiptWithAI } from '@/lib/cloudflare-ai';

// On-device Gemma 4 (LiteRT) handles full NLP on mobile
// Web companion uses Cloudflare Workers AI, falling back to rule-based extraction

// Local message parser — extracts transactions from natural language
// On mobile, the on-device Gemma 4 model handles full NLP
function parseLocalMessage(message) {
  const lower = message.toLowerCase();
  const today = new Date().toISOString().split('T')[0];

  // Income patterns
  const incomeKeywords = ['received', 'got paid', 'salary', 'income', 'earned', 'payment received', 'cash from', 'transfer in'];
  const isIncome = incomeKeywords.some(k => lower.includes(k));

  // Extract amount
  const amountMatch = message.match(/(\d+(?:\.\d{1,2})?)\s*(?:aed|dirham|dhs)/i) || message.match(/(?:aed|dirham|dhs)\s*(\d+(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1] || amountMatch[2]) : null;

  // Extract merchant/source
  const merchantPatterns = [
    /(?:paid|spent|at|to|from|for)\s+([a-z0-9\s]+?)(?:\s+for|\s+in|\s+aed|\s+\d|$)/i,
    /(?:received|got)\s+(\d+[\s\S]*?)\s+from\s+([a-z\s]+?)(?:\s|$)/i,
  ];
  let merchant = 'Unknown';
  for (const p of merchantPatterns) {
    const m = message.match(p);
    if (m) { merchant = (m[2] || m[1]).trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); break; }
  }

  // Extract category
  const categoryMap = {
    food: ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'shawarma', 'karak'],
    transport: ['transport', 'taxi', 'uber', 'careem', 'petrol', 'gas', 'fuel', 'enoc', 'adnoc', 'metro', 'bus', 'salik'],
    shopping: ['shopping', 'mall', 'store', 'clothes', 'grocery', 'carrefour', 'luulu', 'noon', 'amazon'],
    office: ['office', 'supplies', 'stationery', 'printing', 'coworking'],
    utilities: ['utility', 'utilities', 'electricity', 'water', 'dewa', 'internet', 'wifi', 'phone bill'],
    entertainment: ['entertainment', 'movie', 'cinema', 'netflix', 'game', 'concert'],
    health: ['health', 'pharmacy', 'doctor', 'hospital', 'medicine', 'clinic', 'gym'],
    travel: ['travel', 'flight', 'hotel', 'airbnb', 'visa', 'passport', 'booking'],
    banking: ['banking', 'bank', 'fee', 'interest', 'transfer fee', 'atm'],
  };
  let category = isIncome ? 'Income' : 'General';
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(k => lower.includes(k))) { category = cat.charAt(0).toUpperCase() + cat.slice(1); break; }
  }

  // Extract payment method
  let paymentMethod = 'Cash';
  if (/\b(card|credit|debit|visa|mastercard)\b/i.test(message)) paymentMethod = 'Card';
  else if (/\b(transfer|bank)\b/i.test(message)) paymentMethod = 'Bank Transfer';

  // Detect income mode
  let incomeMode = '';
  if (isIncome) {
    incomeMode = /\bcash\b/i.test(message) ? 'cash' : 'account';
  }

  // Build response
  if (amount && amount > 0) {
    const txn = {
      type: 'transaction',
      txnType: isIncome ? 'income' : 'expense',
      merchant,
      date: today,
      amount,
      currency: 'AED',
      vat: isIncome ? 0 : Math.round(amount * 0.05 * 100) / 100,
      category,
      payment_method: paymentMethod,
      description: message,
      tagged_person: '',
    };
    if (isIncome) txn.incomeMode = incomeMode;

    const actionWord = isIncome ? 'received' : 'recorded';
    const reply = isIncome
      ? `Got it! ${amount} AED ${actionWord} from ${merchant} (${incomeMode}). ${category} income logged.`
      : `Recorded: ${merchant} — ${amount} AED (${category}, ${paymentMethod}). VAT: ${txn.vat} AED.`;

    return { reply, transaction: txn };
  }

  // No amount found — conversational response
  if (isIncome) {
    return { reply: 'How much did you receive? Just tell me the amount and source, like "Received 5000 AED salary in account".', transaction: null };
  }
  return { reply: 'Tell me about an expense like "Paid 50 AED at ENOC" and I\'ll log it with VAT. Or ask me about your spending!', transaction: null };
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

    return jsonResponse({ error: 'Not found', path: routePath }, 404);
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}


// ============ CHAT ============
async function handleChat(request) {
  const body = await request.json();
  const { message, sessionId, orgId = 'default', userId = 'admin' } = body;

  if (!message) return jsonResponse({ error: 'Message is required' }, 400);

  const chatSessionId = sessionId || uuidv4();

  // Upsert chat session
  const { error: sessionError } = await supabase
    .from('chat_sessions')
    .upsert({
      session_id: chatSessionId,
      org_id: orgId,
      user_id: userId,
      last_message: message.substring(0, 100),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });

  if (sessionError) console.error('Session upsert error:', sessionError);

  // Save user message
  await supabase.from('messages').insert({
    session_id: chatSessionId, org_id: orgId, user_id: userId,
    role: 'user', content: message, timestamp: new Date().toISOString(),
  });

  try {
    let aiText = '';
    let extractedTransaction = null;

    // Try Cloudflare Workers AI first (real NLP for web companion)
    if (isCloudflareAIAvailable()) {
      try {
        const aiResult = await chatWithFileyAI(message);
        aiText = aiResult.reply;
        if (aiResult.transaction) {
          extractedTransaction = aiResult.transaction;
          extractedTransaction.txnType = aiResult.transaction.type || 'expense';
          // VAT only for expenses, not income
          if (extractedTransaction.txnType === 'income') {
            extractedTransaction.vat = 0;
          } else if (extractedTransaction.amount && !extractedTransaction.vat) {
            extractedTransaction.vat = Math.round(extractedTransaction.amount * 0.05 * 100) / 100;
          }
          extractedTransaction.id = uuidv4();
          extractedTransaction.status = 'pending';
        }
      } catch (aiErr) {
        console.error('Cloudflare AI error, falling back to local parser:', aiErr.message);
      }
    }

    // Fallback: local rule-based extraction
    if (!aiText) {
      const result = parseLocalMessage(message);
      aiText = result.reply;
      if (result.transaction) {
        extractedTransaction = result.transaction;
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
      }
    }

    // Save AI message
    await supabase.from('messages').insert({
      session_id: chatSessionId, org_id: orgId, user_id: 'ai',
      role: 'assistant', content: aiText, extracted_transaction: extractedTransaction,
      timestamp: new Date().toISOString(),
    });

    // Update session last message
    await supabase
      .from('chat_sessions')
      .update({ last_message: message.substring(0, 100), updated_at: new Date().toISOString() })
      .eq('session_id', chatSessionId);

    return jsonResponse({
      sessionId: chatSessionId, message: aiText,
      extractedTransaction, timestamp: new Date().toISOString(),
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

  // Upsert session
  await supabase
    .from('chat_sessions')
    .upsert({
      session_id: chatSessionId, org_id: orgId, user_id: userId,
      last_message: 'Receipt scanned', updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });

  await supabase.from('messages').insert({
    session_id: chatSessionId, org_id: orgId, user_id: userId,
    role: 'user', content: '[Receipt Image Uploaded]', has_image: true,
    timestamp: new Date().toISOString(),
  });

  try {
    // Try Cloudflare Workers AI for receipt parsing (if OCR text is provided or AI is available)
    let extractedTransaction = null;
    let cleanText = '';
    const ocrText = body.ocrText || '';

    if (isCloudflareAIAvailable() && ocrText) {
      try {
        const aiParsed = await parseReceiptWithAI(ocrText);
        if (aiParsed && aiParsed.amount > 0) {
          extractedTransaction = {
            id: uuidv4(),
            type: 'transaction',
            txnType: 'expense',
            ...aiParsed,
            payment_method: aiParsed.paymentMethod || 'Cash',
            status: 'pending',
          };
          cleanText = `Found: **${aiParsed.merchant}** — ${aiParsed.amount} AED (${aiParsed.category}, ${aiParsed.paymentMethod}). VAT: ${aiParsed.vat} AED.`;
        }
      } catch (aiErr) {
        console.error('Cloudflare AI receipt parse error:', aiErr.message);
      }
    }

    // Fallback: placeholder for web companion
    if (!extractedTransaction) {
      const today = new Date().toISOString().split('T')[0];
      extractedTransaction = {
        id: uuidv4(),
        type: 'transaction',
        txnType: 'expense',
        merchant: 'Unknown Merchant',
        date: today,
        trn: '',
        amount: 0,
        currency: 'AED',
        vat: 0,
        category: 'General',
        payment_method: 'Cash',
        description: 'Receipt uploaded — process on mobile for full AI extraction',
        status: 'pending',
      };

      cleanText = isCloudflareAIAvailable()
        ? 'I couldn\'t extract details from this receipt. Try sending a clearer image or describe the expense in chat.'
        : 'Receipt received! Open the Filey app on your device for full AI-powered extraction and auto-fill. On-device processing ensures your data stays private and works offline.';
    }

    await supabase.from('messages').insert({
      session_id: chatSessionId, org_id: orgId, user_id: 'ai',
      role: 'assistant', content: cleanText, extracted_transaction: extractedTransaction,
      timestamp: new Date().toISOString(),
    });

    await supabase
      .from('chat_sessions')
      .update({ last_message: 'Receipt scanned', updated_at: new Date().toISOString() })
      .eq('session_id', chatSessionId);

    return jsonResponse({
      sessionId: chatSessionId, message: cleanText,
      extractedTransaction, timestamp: new Date().toISOString(),
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

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) return jsonResponse({ error: error.message }, 500);

  // Map snake_case columns to camelCase for API compatibility
  const sessions = (data || []).map(s => ({
    sessionId: s.session_id,
    orgId: s.org_id,
    userId: s.user_id,
    lastMessage: s.last_message,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));

  return jsonResponse({ sessions });
}

async function getChatMessages(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return jsonResponse({ error: 'sessionId required' }, 400);

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (error) return jsonResponse({ error: error.message }, 500);

  // Map snake_case to camelCase for API compatibility
  const messages = (data || []).map(m => ({
    id: m.id,
    sessionId: m.session_id,
    orgId: m.org_id,
    userId: m.user_id,
    role: m.role,
    content: m.content,
    hasImage: m.has_image,
    extractedTransaction: m.extracted_transaction,
    timestamp: m.timestamp,
  }));

  return jsonResponse({ messages });
}

// ============ TRANSACTIONS ============
async function getTransactions(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('org_id', orgId)
    .order('date', { ascending: false })
    .limit(50);

  if (error) return jsonResponse({ error: error.message }, 500);

  const transactions = (data || []).map(t => ({
    id: t.id, orgId: t.org_id, userId: t.user_id,
    merchant: t.merchant, customName: t.custom_name,
    date: t.date, amount: t.amount, currency: t.currency,
    vat: t.vat, trn: t.trn, category: t.category,
    payment_method: t.payment_method, description: t.description,
    tagged_person: t.tagged_person, txnType: t.txn_type,
    incomeMode: t.income_mode, status: t.status,
    createdAt: t.created_at, updatedAt: t.updated_at,
    editHistory: t.edit_history,
  }));

  return jsonResponse({ transactions });
}

async function createTransaction(request) {
  const body = await request.json();
  const txnType = body.txnType || 'expense';

  const transaction = {
    org_id: body.orgId || 'default',
    user_id: body.userId || 'admin',
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
    txn_type: txnType,
    income_mode: body.incomeMode || (txnType === 'income' ? 'account' : ''),
    status: 'verified',
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);

  const actionWord = txnType === 'income' ? 'received' : 'added';
  await supabase.from('activity').insert({
    org_id: transaction.org_id,
    user_id: transaction.tagged_person || transaction.user_id,
    type: 'transaction',
    description: `${transaction.tagged_person || transaction.user_id} ${actionWord}: ${transaction.merchant} - ${transaction.amount} ${transaction.currency}${txnType === 'income' ? ` (${transaction.income_mode})` : ''}`,
    category: transaction.category,
  });

  // Map back to camelCase for API response
  const result = {
    id: data.id, orgId: data.org_id, userId: data.user_id,
    merchant: data.merchant, date: data.date, amount: data.amount,
    currency: data.currency, vat: data.vat, trn: data.trn,
    category: data.category, payment_method: data.payment_method,
    description: data.description, tagged_person: data.tagged_person,
    txnType: data.txn_type, incomeMode: data.income_mode,
    status: data.status, createdAt: data.created_at,
  };

  return jsonResponse({ transaction: result, message: 'Transaction saved!' });
}

// ============ DASHBOARD ============
async function getDashboard(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: transactions, error: txnError } = await supabase
    .from('transactions')
    .select('*')
    .eq('org_id', orgId)
    .order('date', { ascending: false });

  if (txnError) return jsonResponse({ error: txnError.message }, 500);

  const monthly = (transactions || []).filter(t => t.created_at >= startOfMonth);
  const expenses = monthly.filter(t => (t.txn_type || 'expense') === 'expense');
  const incomes = monthly.filter(t => t.txn_type === 'income');

  const totalSpend = expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const totalVat = expenses.reduce((s, t) => s + (parseFloat(t.vat) || 0), 0);
  const totalIncome = incomes.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const cashReceived = incomes.filter(t => t.income_mode === 'cash').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const accountReceived = incomes.filter(t => t.income_mode === 'account').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const categories = {};
  monthly.forEach(t => { categories[t.category || 'General'] = (categories[t.category || 'General'] || 0) + (parseFloat(t.amount) || 0); });

  const { data: recentActivity } = await supabase
    .from('activity')
    .select('*')
    .eq('org_id', orgId)
    .order('timestamp', { ascending: false })
    .limit(10);

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
    recentTransactions: (transactions || []).slice(0, 5).map(t => ({
      id: t.id, orgId: t.org_id, userId: t.user_id,
      merchant: t.merchant, customName: t.custom_name,
      date: t.date, amount: t.amount, currency: t.currency,
      vat: t.vat, trn: t.trn, category: t.category,
      payment_method: t.payment_method, description: t.description,
      tagged_person: t.tagged_person, txnType: t.txn_type,
      incomeMode: t.income_mode, status: t.status,
      createdAt: t.created_at, updatedAt: t.updated_at,
      editHistory: t.edit_history,
    })),
    recentActivity: (recentActivity || []).map(a => ({
      id: a.id, orgId: a.org_id, userId: a.user_id,
      type: a.type, description: a.description, category: a.category,
      timestamp: a.timestamp,
    })),
    scanCount: expenses.length,
    scanLimit: 50,
    plan: 'basic',
  });
}

// ============ TEAM ============
async function getTeam(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  let { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No team found — create default
    const { data: newTeam, error: insertError } = await supabase
      .from('teams')
      .insert({
        org_id: orgId,
        name: 'My Organization',
        admin: { id: 'admin', name: 'Admin', email: 'admin@filely.ae', role: 'admin' },
        members: [],
      })
      .select()
      .single();

    if (insertError) return jsonResponse({ error: insertError.message }, 500);
    team = newTeam;
  } else if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    team: {
      id: team.id, orgId: team.org_id, name: team.name,
      admin: team.admin, members: team.members,
      createdAt: team.created_at, updatedAt: team.updated_at,
    },
  });
}

async function inviteTeamMember(request) {
  const body = await request.json();
  const { orgId = 'default', name, email, role = 'member' } = body;

  if (!name || !email) return jsonResponse({ error: 'Name and email are required' }, 400);

  const member = { id: uuidv4(), name, email, role, joinedAt: new Date().toISOString() };

  // Get current members and push new one
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('members')
    .eq('org_id', orgId)
    .single();

  if (teamError) return jsonResponse({ error: teamError.message }, 500);

  const members = [...(team.members || []), member];

  const { error: updateError } = await supabase
    .from('teams')
    .update({ members, updated_at: new Date().toISOString() })
    .eq('org_id', orgId);

  if (updateError) return jsonResponse({ error: updateError.message }, 500);

  await supabase.from('activity').insert({
    org_id: orgId, user_id: 'admin', type: 'team',
    description: `Invited ${name} (${role}) to the team`,
  });

  return jsonResponse({ member, message: `${name} has been invited!` });
}

async function getTeamActivity(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('org_id', orgId)
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) return jsonResponse({ error: error.message }, 500);

  const activity = (data || []).map(a => ({
    id: a.id, orgId: a.org_id, userId: a.user_id,
    type: a.type, description: a.description, category: a.category,
    timestamp: a.timestamp,
  }));

  return jsonResponse({ activity });
}

// ============ SETTINGS ============
async function getProfile(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No profile found — create default
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        org_id: orgId, name: 'User', email: 'user@filely.ae',
        company: 'My Company', plan: 'basic', scan_count: 0, scan_limit: 10,
      })
      .select()
      .single();

    if (insertError) return jsonResponse({ error: insertError.message }, 500);
    profile = newProfile;
  } else if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({
    profile: {
      id: profile.id, orgId: profile.org_id, name: profile.name,
      email: profile.email, company: profile.company, plan: profile.plan,
      scanCount: profile.scan_count, scanLimit: profile.scan_limit,
      avatar: profile.avatar, createdAt: profile.created_at, updatedAt: profile.updated_at,
    },
  });
}

async function updateProfile(request) {
  const body = await request.json();
  const orgId = body.orgId || 'default';

  const updateData = { updated_at: new Date().toISOString() };
  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.company) updateData.company = body.company;

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('org_id', orgId);

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ message: 'Profile updated!' });
}

// ============ AVATAR ============
async function updateAvatar(request) {
  const body = await request.json();
  const { orgId = 'default', avatar } = body;
  if (!avatar) return jsonResponse({ error: 'avatar (base64) required' }, 400);

  const { error } = await supabase
    .from('profiles')
    .update({ avatar, updated_at: new Date().toISOString() })
    .eq('org_id', orgId);

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ message: 'Avatar updated!' });
}

// ============ CERTIFICATES ============
async function getCertificates(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return jsonResponse({ error: error.message }, 500);

  const certificates = (data || []).map(c => ({
    id: c.id, orgId: c.org_id, name: c.name, file: c.file,
    mimeType: c.mime_type, createdAt: c.created_at,
  }));

  return jsonResponse({ certificates });
}

async function addCertificate(request) {
  const body = await request.json();
  const { orgId = 'default', name, file, mimeType = 'application/pdf' } = body;
  if (!name || !file) return jsonResponse({ error: 'name and file (base64) required' }, 400);

  const { data, error } = await supabase
    .from('certificates')
    .insert({ org_id: orgId, name, file, mime_type: mimeType })
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({
    certificate: { id: data.id, name: data.name, mimeType: data.mime_type, createdAt: data.created_at },
  });
}

async function deleteCertificate(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id required' }, 400);

  const { error } = await supabase
    .from('certificates')
    .delete()
    .eq('id', id);

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ message: 'Certificate deleted' });
}

// ============ REMINDERS ============
async function getReminders(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  let { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('org_id', orgId)
    .order('time', { ascending: true });

  if (error) return jsonResponse({ error: error.message }, 500);

  if (!reminders || reminders.length === 0) {
    const defaults = [
      { org_id: orgId, time: '10:00', label: '10:00 AM' },
      { org_id: orgId, time: '18:00', label: '06:00 PM' },
    ];
    const { data: inserted, error: insertError } = await supabase
      .from('reminders')
      .insert(defaults)
      .select();

    if (insertError) return jsonResponse({ error: insertError.message }, 500);
    reminders = inserted;
  }

  return jsonResponse({
    reminders: reminders.map(r => ({
      id: r.id, orgId: r.org_id, time: r.time, label: r.label, createdAt: r.created_at,
    })),
  });
}

async function addReminder(request) {
  const body = await request.json();
  const { orgId = 'default', time } = body;
  if (!time) return jsonResponse({ error: 'time required (HH:MM)' }, 400);

  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const label = `${hour > 12 ? String(hour - 12).padStart(2, '0') : h}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;

  const { data, error } = await supabase
    .from('reminders')
    .insert({ org_id: orgId, time, label })
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({
    reminder: { id: data.id, orgId: data.org_id, time: data.time, label: data.label, createdAt: data.created_at },
  });
}

async function deleteReminder(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id required' }, 400);

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id);

  if (error) return jsonResponse({ error: error.message }, 500);
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
  const type = searchParams.get('type') || 'all';

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo) query = query.lte('date', dateTo);
  if (amountMin > 0) query = query.gte('amount', amountMin);
  if (amountMax < 999999) query = query.lte('amount', amountMax);

  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);

  const files = (data || []).map(t => ({
    id: t.id, orgId: t.org_id, userId: t.user_id,
    merchant: t.merchant, customName: t.custom_name,
    date: t.date, amount: t.amount, currency: t.currency,
    vat: t.vat, trn: t.trn, category: t.category,
    payment_method: t.payment_method, description: t.description,
    tagged_person: t.tagged_person, txnType: t.txn_type,
    incomeMode: t.income_mode, status: t.status,
    createdAt: t.created_at, updatedAt: t.updated_at,
    editHistory: t.edit_history,
  }));

  return jsonResponse({ files, total: files.length });
}

async function editFile(request) {
  const body = await request.json();
  const { id, merchant, category, amount, editedBy = 'admin' } = body;

  if (!id) return jsonResponse({ error: 'id required' }, 400);

  // Get current transaction
  const { data: current, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) return jsonResponse({ error: 'Transaction not found' }, 404);

  // Build update and history entry
  const changes = [];
  const update = { updated_at: new Date().toISOString() };

  if (merchant !== undefined && merchant !== (current.custom_name || current.merchant)) {
    changes.push({ field: 'name', from: current.custom_name || current.merchant, to: merchant });
    update.custom_name = merchant;
  }
  if (category !== undefined && category !== current.category) {
    changes.push({ field: 'category', from: current.category, to: category });
    update.category = category;
  }
  if (amount !== undefined && parseFloat(amount) !== parseFloat(current.amount)) {
    const newAmount = parseFloat(amount);
    changes.push({ field: 'amount', from: current.amount, to: newAmount });
    update.amount = newAmount;
    update.vat = Math.round(newAmount * 0.05 * 100) / 100;
  }

  if (changes.length === 0) return jsonResponse({ message: 'No changes detected' });

  // Push to edit history
  const historyEntry = {
    id: uuidv4(),
    transactionId: id,
    editedBy,
    changes,
    timestamp: new Date().toISOString(),
  };

  update.edit_history = [...(current.edit_history || []), historyEntry];

  const { error: updateError } = await supabase
    .from('transactions')
    .update(update)
    .eq('id', id);

  if (updateError) return jsonResponse({ error: updateError.message }, 500);

  // Log as activity
  const changeDesc = changes.map(c => `${c.field}: ${c.from} → ${c.to}`).join(', ');
  await supabase.from('activity').insert({
    org_id: current.org_id || 'default',
    user_id: editedBy,
    type: 'edit',
    description: `${editedBy} edited ${current.custom_name || current.merchant}: ${changeDesc}`,
    category: 'Edit',
  });

  return jsonResponse({ message: 'Transaction updated!', changes, historyEntry });
}

async function getEditHistory(request) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('id');

  if (!transactionId) return jsonResponse({ error: 'id required' }, 400);

  const { data: txn, error } = await supabase
    .from('transactions')
    .select('edit_history')
    .eq('id', transactionId)
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  if (!txn) return jsonResponse({ error: 'Not found' }, 404);

  return jsonResponse({ editHistory: (txn.edit_history || []).reverse() });
}

async function exportData(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const amountMin = parseFloat(searchParams.get('amountMin') || '0');
  const amountMax = parseFloat(searchParams.get('amountMax') || '999999');
  const category = searchParams.get('category');

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('org_id', orgId)
    .order('date', { ascending: false });

  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo) query = query.lte('date', dateTo);
  if (amountMin > 0) query = query.gte('amount', amountMin);
  if (amountMax < 999999) query = query.lte('amount', amountMax);
  if (category && category !== 'all') query = query.eq('category', category);

  const { data: transactions, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);

  const subtotal = (transactions || []).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const totalVat = (transactions || []).reduce((s, t) => s + (parseFloat(t.vat) || 0), 0);

  const reportId = `FLD-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9999)}`;

  return jsonResponse({
    reportId,
    generatedAt: new Date().toISOString(),
    dateRange: { from: dateFrom || 'All', to: dateTo || 'All' },
    filters: { amountMin, amountMax, category: category || 'All' },
    transactions: (transactions || []).map(t => ({
      id: t.id,
      date: t.date,
      merchant: t.custom_name || t.merchant,
      vat: t.vat || 0,
      amount: t.amount || 0,
      category: t.category,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    grandTotal: Math.round((subtotal + totalVat) * 100) / 100,
    transactionCount: (transactions || []).length,
  });
}

// ============ TEAM CHAT ============
async function getTeamChat(request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || 'default';

  const { data, error } = await supabase
    .from('team_chat')
    .select('*')
    .eq('org_id', orgId)
    .order('timestamp', { ascending: true })
    .limit(50);

  if (error) return jsonResponse({ error: error.message }, 500);

  const messages = (data || []).map(m => ({
    id: m.id, orgId: m.org_id, userId: m.user_id,
    userName: m.user_name, message: m.message, timestamp: m.timestamp,
  }));

  return jsonResponse({ messages });
}

async function sendTeamChat(request) {
  const body = await request.json();
  const { orgId = 'default', userId = 'admin', userName = 'Admin', message } = body;

  if (!message) return jsonResponse({ error: 'Message required' }, 400);

  const { data, error } = await supabase
    .from('team_chat')
    .insert({ org_id: orgId, user_id: userId, user_name: userName, message })
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({
    chatMessage: {
      id: data.id, orgId: data.org_id, userId: data.user_id,
      userName: data.user_name, message: data.message, timestamp: data.timestamp,
    },
  });
}

// Export handlers
export async function GET(request, context) { return handler(request, context); }
export async function POST(request, context) { return handler(request, context); }
export async function PUT(request, context) { return handler(request, context); }
export async function DELETE(request, context) { return handler(request, context); }
export async function OPTIONS(request) { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }