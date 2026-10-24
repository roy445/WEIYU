-- Run this once on the production PostgreSQL database before deploying the rewards features.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_discount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_title text,
  ADD COLUMN IF NOT EXISTS points_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS avatar_updates (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS avatar_updates_user_created_idx ON avatar_updates(user_id, created_at);

CREATE TABLE IF NOT EXISTS coupons (
  id serial PRIMARY KEY,
  code text NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  value integer NOT NULL,
  minimum_subtotal integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_unique ON coupons(code);
CREATE INDEX IF NOT EXISTS coupons_active_expiry_idx ON coupons(is_active, expires_at);

CREATE TABLE IF NOT EXISTS user_coupons (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id integer NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'available',
  claimed_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_order_id integer REFERENCES orders(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS user_coupons_user_coupon_unique ON user_coupons(user_id, coupon_id);
CREATE INDEX IF NOT EXISTS user_coupons_user_status_idx ON user_coupons(user_id, status);

CREATE TABLE IF NOT EXISTS point_lots (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  remaining integer NOT NULL,
  source text NOT NULL,
  source_order_id integer REFERENCES orders(id) ON DELETE SET NULL,
  source_coupon_id integer REFERENCES coupons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS point_lots_user_expiry_idx ON point_lots(user_id, expires_at);

CREATE TABLE IF NOT EXISTS order_point_uses (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  point_lot_id integer NOT NULL REFERENCES point_lots(id) ON DELETE RESTRICT,
  amount integer NOT NULL,
  restored_at timestamptz
);
CREATE INDEX IF NOT EXISTS order_point_uses_order_idx ON order_point_uses(order_id);
