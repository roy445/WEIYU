ALTER TABLE products
  ADD COLUMN IF NOT EXISTS requires_refrigeration boolean;
