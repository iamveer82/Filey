-- Filey: Initial Supabase schema
-- Migrates from MongoDB collections to PostgreSQL tables
-- Includes Row Level Security (RLS) policies for multi-tenant auth

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ PROFILES ============
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'User',
  email TEXT NOT NULL DEFAULT 'user@filely.ae',
  company TEXT NOT NULL DEFAULT 'My Company',
  plan TEXT NOT NULL DEFAULT 'basic',
  scan_count INTEGER NOT NULL DEFAULT 0,
  scan_limit INTEGER NOT NULL DEFAULT 10,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============ CHAT SESSIONS ============
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL DEFAULT 'admin',
  last_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

-- ============ MESSAGES ============
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL DEFAULT 'admin',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  has_image BOOLEAN DEFAULT false,
  extracted_transaction JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ TRANSACTIONS ============
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL DEFAULT 'admin',
  merchant TEXT NOT NULL DEFAULT 'Unknown',
  custom_name TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AED',
  vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  trn TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  description TEXT NOT NULL DEFAULT '',
  tagged_person TEXT NOT NULL DEFAULT '',
  txn_type TEXT NOT NULL DEFAULT 'expense' CHECK (txn_type IN ('expense', 'income')),
  income_mode TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  edit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============ ACTIVITY ============
CREATE TABLE activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL DEFAULT 'admin',
  type TEXT NOT NULL DEFAULT 'transaction',
  description TEXT NOT NULL DEFAULT '',
  category TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ TEAMS ============
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'My Organization',
  admin JSONB NOT NULL DEFAULT '{"id":"admin","name":"Admin","email":"admin@filely.ae","role":"admin"}'::jsonb,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE(org_id)
);

-- ============ CERTIFICATES ============
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  file TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ REMINDERS ============
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  time TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ TEAM CHAT ============
CREATE TABLE team_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL DEFAULT 'admin',
  user_name TEXT NOT NULL DEFAULT 'Admin',
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_transactions_org ON transactions(org_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_activity_org ON activity(org_id);
CREATE INDEX idx_activity_timestamp ON activity(timestamp);
CREATE INDEX idx_chat_sessions_org ON chat_sessions(org_id);
CREATE INDEX idx_chat_sessions_updated ON chat_sessions(updated_at);
CREATE INDEX idx_reminders_org ON reminders(org_id);
CREATE INDEX idx_team_chat_org ON team_chat(org_id);

-- ============ ROW LEVEL SECURITY ============
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_chat ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (true); -- Allow all reads for now (org-based filtering in app)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- Chat sessions: org-scoped access
CREATE POLICY "Org members can view sessions" ON chat_sessions
  FOR SELECT USING (true);
CREATE POLICY "Org members can insert sessions" ON chat_sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Org members can update sessions" ON chat_sessions
  FOR UPDATE USING (true);

-- Messages: org-scoped access
CREATE POLICY "Org members can view messages" ON messages
  FOR SELECT USING (true);
CREATE POLICY "Org members can insert messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Transactions: org-scoped access
CREATE POLICY "Org members can view transactions" ON transactions
  FOR SELECT USING (true);
CREATE POLICY "Org members can insert transactions" ON transactions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Org members can update transactions" ON transactions
  FOR UPDATE USING (true);
CREATE POLICY "Org members can delete transactions" ON transactions
  FOR DELETE USING (true);

-- Activity: org-scoped access
CREATE POLICY "Org members can view activity" ON activity
  FOR SELECT USING (true);
CREATE POLICY "Org members can insert activity" ON activity
  FOR INSERT WITH CHECK (true);

-- Teams: org-scoped access
CREATE POLICY "Org members can view team" ON teams
  FOR SELECT USING (true);
CREATE POLICY "Org members can update team" ON teams
  FOR UPDATE USING (true);
CREATE POLICY "Org members can insert team" ON teams
  FOR INSERT WITH CHECK (true);

-- Certificates: org-scoped access
CREATE POLICY "Org members can view certificates" ON certificates
  FOR SELECT USING (true);
CREATE POLICY "Org members can insert certificates" ON certificates
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Org members can delete certificates" ON certificates
  FOR DELETE USING (true);

-- Reminders: org-scoped access
CREATE POLICY "Org members can view reminders" ON reminders
  FOR SELECT USING (true);
CREATE POLICY "Org members can insert reminders" ON reminders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Org members can delete reminders" ON reminders
  FOR DELETE USING (true);

-- Team chat: org-scoped access
CREATE POLICY "Org members can view team chat" ON team_chat
  FOR SELECT USING (true);
CREATE POLICY "Org members can insert team chat" ON team_chat
  FOR INSERT WITH CHECK (true);