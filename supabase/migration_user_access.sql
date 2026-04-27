-- ─────────────────────────────────────────────────────────────────────────────
-- user_access table + backfill
--
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to run on a live database — uses ON CONFLICT DO NOTHING for the backfill.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the table
CREATE TABLE IF NOT EXISTS user_access (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  can_render    boolean     NOT NULL DEFAULT false,
  render_quota  integer     DEFAULT NULL,   -- NULL = unlimited; integer = remaining renders
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;

-- 3. Service role can do everything (used by the render API route via service key)
CREATE POLICY "service role full access"
  ON user_access
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Authenticated users can read their own row (optional — not required by the API)
CREATE POLICY "users can read own row"
  ON user_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 5. Backfill: mark every existing user as approved with unlimited render access.
--    New users invited later will have NO row until you manually insert one.
INSERT INTO user_access (id, can_render, render_quota)
SELECT id, true, NULL
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- After running this migration, to grant access to a newly invited user run:
--
--   INSERT INTO user_access (id, can_render, render_quota)
--   VALUES ('<USER_UUID_FROM_AUTH_USERS>', true, NULL);
--
-- To grant limited renders (e.g. 10):
--
--   INSERT INTO user_access (id, can_render, render_quota)
--   VALUES ('<USER_UUID>', true, 10);
--
-- To revoke render access:
--
--   UPDATE user_access SET can_render = false WHERE id = '<USER_UUID>';
-- ─────────────────────────────────────────────────────────────────────────────
