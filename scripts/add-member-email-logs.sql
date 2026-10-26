ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id serial PRIMARY KEY,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_delivery_logs_created_idx
  ON email_delivery_logs (created_at);

CREATE INDEX IF NOT EXISTS email_delivery_logs_status_idx
  ON email_delivery_logs (status);
