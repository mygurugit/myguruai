-- ============================================
-- MyGuru AI — Complete Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable vector extension for semantic cache
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. PLANS TABLE
-- ============================================
CREATE TABLE plans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  price_monthly   INTEGER NOT NULL,
  daily_limit     INTEGER NOT NULL,
  monthly_limit   INTEGER NOT NULL,
  max_tokens      INTEGER NOT NULL,
  exams           TEXT[] NOT NULL,
  is_active       BOOLEAN DEFAULT true
);

INSERT INTO plans VALUES
  ('free',  'Free',      0,   10,  300,   600,  ARRAY['all'],                    true),
  ('tnpsc', 'TNPSC',     79,  50,  1500,  1000, ARRAY['TNPSC'],                  true),
  ('neet',  'NEET',      129, 60,  1800,  1200, ARRAY['NEET'],                   true),
  ('jee',   'JEE',       129, 60,  1800,  1200, ARRAY['JEE'],                    true),
  ('upsc',  'UPSC',      199, 60,  1800,  1500, ARRAY['UPSC'],                   true),
  ('bank',  'Bank PO',   79,  50,  1500,  1000, ARRAY['Bank PO','SSC'],          true),
  ('ssc',   'SSC',       79,  50,  1500,  1000, ARRAY['SSC','Railway'],          true),
  ('all',   'All Exams', 249, 100, 3000,  1500, ARRAY['NEET','JEE','TNPSC',
                                                 'UPSC','Bank PO','SSC'],        true);

-- ============================================
-- 2. USERS TABLE
-- ============================================
CREATE TABLE users (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT,
  email_normalized TEXT UNIQUE,
  name             TEXT,
  phone            TEXT,
  preferred_exam   TEXT DEFAULT 'TNPSC',
  preferred_lang   TEXT DEFAULT 'Tamil',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id          TEXT NOT NULL REFERENCES plans(id),
  status           TEXT NOT NULL DEFAULT 'trial',
  trial_start      TIMESTAMPTZ DEFAULT NOW(),
  trial_end        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  paid_start       TIMESTAMPTZ,
  end_date         TIMESTAMPTZ,
  razorpay_sub_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 4. USAGE LOGS TABLE
-- ============================================
CREATE TABLE usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  answer       TEXT,
  exam_type    TEXT,
  language     TEXT,
  tokens_used  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  date         DATE DEFAULT CURRENT_DATE
);

-- ============================================
-- 5. QUESTION CACHE TABLE
-- ============================================
CREATE TABLE question_cache (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question             TEXT NOT NULL,
  question_normalised  TEXT NOT NULL,
  canonical_topic      TEXT,
  answer_tamil         TEXT,
  answer_hindi         TEXT,
  answer_english       TEXT,
  embedding            vector(1536),
  exam_type            TEXT NOT NULL,
  subject              TEXT,
  source               TEXT DEFAULT 'student',
  is_verified          BOOLEAN DEFAULT false,
  hit_count            INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. TRIAL PHONES TABLE
-- ============================================
CREATE TABLE trial_phones (
  phone      TEXT PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  used_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_usage_user_date    ON usage_logs(user_id, date);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_cache_exam         ON question_cache(exam_type);
CREATE INDEX idx_cache_normalised   ON question_cache(question_normalised, exam_type);
CREATE INDEX ON question_cache USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "subscriptions_own_data" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "usage_own_data" ON usage_logs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTION — expire trials daily
-- ============================================
CREATE OR REPLACE FUNCTION expire_trials()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'trial_expired', updated_at = NOW()
  WHERE status = 'trial' AND trial_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION — get user access level
-- ============================================
CREATE OR REPLACE FUNCTION get_user_access(p_user_id UUID)
RETURNS TABLE (
  access_level  TEXT,
  plan_id       TEXT,
  daily_limit   INTEGER,
  max_tokens    INTEGER,
  days_left     INTEGER,
  show_upgrade  BOOLEAN
) AS $$
DECLARE
  v_sub  subscriptions%ROWTYPE;
  v_plan plans%ROWTYPE;
BEGIN
  SELECT * INTO v_sub FROM subscriptions WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    SELECT * INTO v_plan FROM plans WHERE id = 'free';
    RETURN QUERY SELECT 'free'::TEXT, 'free'::TEXT,
      v_plan.daily_limit, v_plan.max_tokens, 0, false;
    RETURN;
  END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_sub.plan_id;

  IF v_sub.status = 'trial' AND v_sub.trial_end > NOW() THEN
    RETURN QUERY SELECT
      'trial'::TEXT, v_sub.plan_id,
      v_plan.daily_limit, v_plan.max_tokens,
      EXTRACT(DAY FROM (v_sub.trial_end - NOW()))::INTEGER,
      false;
    RETURN;
  END IF;

  IF v_sub.status = 'active' AND v_sub.end_date > NOW() THEN
    RETURN QUERY SELECT
      'paid'::TEXT, v_sub.plan_id,
      v_plan.daily_limit, v_plan.max_tokens, 0, false;
    RETURN;
  END IF;

  SELECT * INTO v_plan FROM plans WHERE id = 'free';
  RETURN QUERY SELECT
    'free'::TEXT, 'free'::TEXT,
    v_plan.daily_limit, v_plan.max_tokens, 0, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;