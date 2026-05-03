-- ─────────────────────────────────────────────────────────────────────────────
-- SentinelQuiz — Initial Schema Migration
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── quiz_sessions ────────────────────────────────────────────────────────────
-- Stores imported quiz item sets per user

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Untitled Quiz',
  items       JSONB NOT NULL,
  item_count  INTEGER GENERATED ALWAYS AS (jsonb_array_length(items)) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only access their own sessions
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON quiz_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── quiz_results ─────────────────────────────────────────────────────────────
-- Stores completed quiz run results

CREATE TABLE IF NOT EXISTS quiz_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES quiz_sessions(id) ON DELETE SET NULL,
  score           INTEGER NOT NULL DEFAULT 0,
  total_possible  INTEGER NOT NULL DEFAULT 0,
  mode            TEXT NOT NULL CHECK (mode IN ('identification', 'multiple_choice')),
  answers         JSONB NOT NULL DEFAULT '[]',
  accuracy        INTEGER GENERATED ALWAYS AS (
                    CASE WHEN jsonb_array_length(answers) = 0 THEN 0
                    ELSE ROUND(
                      (SELECT COUNT(*) FROM jsonb_array_elements(answers) a
                       WHERE (a->>'correct')::boolean = true)::numeric
                      / jsonb_array_length(answers) * 100
                    ) END
                  ) STORED,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only access their own results
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own results"
  ON quiz_results
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX idx_quiz_results_session_id ON quiz_results(session_id);
CREATE INDEX idx_quiz_results_completed_at ON quiz_results(completed_at DESC);

-- ─── Updated-at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_sessions_updated_at
  BEFORE UPDATE ON quiz_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
