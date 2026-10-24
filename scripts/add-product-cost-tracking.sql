-- Run once on the target PostgreSQL database before deploying product costing and tracking.
CREATE TABLE IF NOT EXISTS materials (
  id serial PRIMARY KEY,
  name text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('g', 'ml', 'piece')),
  package_quantity_milli integer NOT NULL CHECK (package_quantity_milli > 0),
  purchase_cost integer NOT NULL CHECK (purchase_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS materials_name_unique ON materials(name);

CREATE TABLE IF NOT EXISTS product_recipe_items (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  material_id integer NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  amount_milli integer NOT NULL CHECK (amount_milli > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_recipe_material_unique
  ON product_recipe_items(product_id, material_id);
CREATE INDEX IF NOT EXISTS product_recipe_product_idx ON product_recipe_items(product_id);

CREATE TABLE IF NOT EXISTS product_cost_settings (
  product_id integer PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  batch_yield integer NOT NULL DEFAULT 1 CHECK (batch_yield > 0),
  labor_cost integer NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  overhead_cost integer NOT NULL DEFAULT 0 CHECK (overhead_cost >= 0),
  waste_basis_points integer NOT NULL DEFAULT 0 CHECK (waste_basis_points BETWEEN 0 AND 10000),
  target_margin_basis_points integer NOT NULL DEFAULT 5000 CHECK (target_margin_basis_points BETWEEN 0 AND 9900),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_metric_events (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('view', 'cart_add')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_metric_events_product_time_idx
  ON product_metric_events(product_id, created_at);
CREATE INDEX IF NOT EXISTS product_metric_events_event_time_idx
  ON product_metric_events(event, created_at);

CREATE TABLE IF NOT EXISTS product_trackers (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_trackers_user_product_unique
  ON product_trackers(user_id, product_id);
CREATE INDEX IF NOT EXISTS product_trackers_product_idx ON product_trackers(product_id);
CREATE INDEX IF NOT EXISTS orders_status_completed_idx ON orders(status, completed_at);
