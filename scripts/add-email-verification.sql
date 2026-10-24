-- Run once on the production PostgreSQL database before deploying email verification.
-- Existing accounts start unverified and must use the resend-activation flow.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_verification_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_verification_user_unique
  ON email_verification_tokens(user_id);
