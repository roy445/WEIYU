-- Run once on the production PostgreSQL database before deploying membership and sharing features.
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS max_discount integer,
  ADD COLUMN IF NOT EXISTS new_member_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claim_expires_days integer;

UPDATE coupons SET max_discount = 1000000 WHERE type = 'percent' AND max_discount IS NULL;

ALTER TABLE user_coupons
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE TABLE IF NOT EXISTS cart_shares (
  id serial PRIMARY KEY,
  token_hash text NOT NULL,
  items jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cart_shares_token_hash_unique ON cart_shares(token_hash);
CREATE INDEX IF NOT EXISTS cart_shares_expiry_idx ON cart_shares(expires_at);

INSERT INTO coupons (
  code,
  title,
  type,
  value,
  minimum_subtotal,
  expires_at,
  new_member_only,
  first_order_only,
  claim_expires_days,
  max_redemptions,
  is_active
)
VALUES (
  'NEW50',
  '新會員首購折 NT$50',
  'fixed',
  50,
  300,
  '2100-01-01 00:00:00+00',
  true,
  true,
  30,
  NULL,
  true
)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  value = EXCLUDED.value,
  minimum_subtotal = EXCLUDED.minimum_subtotal,
  expires_at = EXCLUDED.expires_at,
  new_member_only = EXCLUDED.new_member_only,
  first_order_only = EXCLUDED.first_order_only,
  claim_expires_days = EXCLUDED.claim_expires_days,
  is_active = EXCLUDED.is_active;
