-- Filey Database Schema
-- Run this in Supabase SQL Editor to initialize tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL DEFAULT 'User',
  email TEXT NOT NULL,
  company TEXT DEFAULT '',
  avatar TEXT,
  plan TEXT DEFAULT 'basic',
  scan_count INTEGER DEFAULT 0,
  scan_limit INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id) WHERE user_id IS NOT NULL;

-- ============ TEAMS ============
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'My Organization',
  admin JSONB DEFAULT '{"id": "admin", "name": "Admin", "email": "admin@filely.ae", "role": "admin"}',
  members JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_org_id ON teams(org_id);

-- ============ TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id UUID DEFAULT NULL,
  merchant TEXT NOT NULL DEFAULT 'Unknown',
  custom_name TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  vat NUMERIC(10,2) DEFAULT 0,
  trn TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  payment_method TEXT DEFAULT 'Cash',
  description TEXT DEFAULT '',
  tagged_person TEXT DEFAULT '',
  txn_type TEXT DEFAULT 'expense' CHECK (txn_type IN ('expense', 'income')),
  income_mode TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  edit_history JSONB DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_txn_type ON transactions(txn_type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- ============ CHAT SESSIONS ============
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT DEFAULT 'admin',
  last_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_org_id ON chat_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT DEFAULT 'admin',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  has_image BOOLEAN DEFAULT FALSE,
  extracted_transaction JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- ============ ACTIVITY LOG ============
CREATE TABLE IF NOT EXISTS activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT DEFAULT 'admin',
  type TEXT NOT NULL CHECK (type IN ('transaction', 'edit', 'team', 'settings', 'chat')),
  description TEXT NOT NULL,
  category TEXT DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_org_id ON activity(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp DESC);

-- ============ TEAM CHAT ============
CREATE TABLE IF NOT EXISTS team_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT DEFAULT 'admin',
  user_name TEXT DEFAULT 'User',
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_chat_org_id ON team_chat(org_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_timestamp ON team_chat(timestamp);

-- ============ CERTIFICATES ============
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  file TEXT NOT NULL, -- base64 encoded
  mime_type TEXT DEFAULT 'application/pdf',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_org_id ON certificates(org_id);

-- ============ REMINDERS ============
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id TEXT NOT NULL DEFAULT 'default',
  time TEXT NOT NULL, -- HH:MM format
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_org_id ON reminders(org_id);

-- ============ STORAGE BUCKET (for receipts) ============
-- This is created via Supabase UI: Storage > Create bucket > "receipts"
-- Set to private, enable file size limit ~10MB

-- ============ ROW LEVEL SECURITY (RLS) ============
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- For development/demo: allow all authenticated users full access
-- In production, tighten these policies per org_id

CREATE POLICY "Allow authenticated users all actions on profiles"
  ON profiles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all actions on teams"
  ON teams FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all actions on transactions"
  ON transactions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all actions on chat_sessions"
  ON chat_sessions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all actions on messages"
  ON messages FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all actions on activity"
  ON activity FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all actions on team_chat"
  ON team_chat FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all actions on certificates"
  ON certificates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all actions on reminders"
  ON reminders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============ STORAGE RLS ============
-- Create policy for receipts bucket (run in Storage section or via SQL)
-- INSERT INTO storage.policies VALUES ...

-- ============ FUNCTIONS & TRIGGERS ============
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============ SEED DATA (optional) ============
-- Insert default org profile
INSERT INTO profiles (org_id, name, email, company)
VALUES ('default', 'Admin User', 'admin@filely.ae', 'My Company')
ON CONFLICT DO NOTHING;
