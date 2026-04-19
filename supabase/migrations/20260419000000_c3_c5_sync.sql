-- Filey: C3–C5 sync tables
-- Backs AsyncStorage-only services (projects, delegation, referrals,
-- public shares, receipt versioning) with cloud sync so state follows
-- the user across devices.

-- ============ PROJECTS / CLIENT BILL-BACK ============
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  client TEXT,
  color TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_org ON projects(org_id) WHERE archived = FALSE;

-- ============ OOO DELEGATION ============
CREATE TABLE deputies (
  manager_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  deputy_id TEXT NOT NULL,
  deputy_name TEXT,
  start_date DATE,
  end_date DATE,
  note TEXT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deputies_org ON deputies(org_id);

-- ============ REFERRAL CODES ============
CREATE TABLE referral_codes (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

CREATE TABLE referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redeemer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  granted_until TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(redeemer_id, code)
);
CREATE INDEX idx_redemptions_redeemer ON referral_redemptions(redeemer_id);

CREATE TABLE premium_credits (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  premium_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PUBLIC SHARE LINKS (ACCOUNTANT VIEW) ============
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT 'default',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  from_date DATE,
  to_date DATE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_share_links_org ON share_links(org_id) WHERE revoked = FALSE;
CREATE INDEX idx_share_links_token ON share_links(token);

-- ============ RECEIPT VERSION AUDIT TRAIL ============
CREATE TABLE tx_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL DEFAULT 'default',
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'edit')),
  reason TEXT,
  ocr_text TEXT,
  image_uri TEXT,
  snapshot JSONB NOT NULL,
  diff JSONB,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tx_versions_tx ON tx_versions(tx_id, ts);

-- ============ RLS — match prevailing "org-scoped in app" stance ============
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deputies ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tx_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects all" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "deputies all" ON deputies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "referral_codes all" ON referral_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "referral_redemptions all" ON referral_redemptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "premium_credits all" ON premium_credits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "share_links all" ON share_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tx_versions all" ON tx_versions FOR ALL USING (true) WITH CHECK (true);

-- Public share reads by token — anon clients should be able to SELECT
-- a share_link row by its opaque token when serving the accountant view.
CREATE POLICY "public share read by token" ON share_links
  FOR SELECT USING (revoked = FALSE AND expires_at > now());
