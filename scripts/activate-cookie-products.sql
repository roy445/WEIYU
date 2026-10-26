-- Activate the cookie listings for display while keeping every item sold out.
-- The 7-day period is a conservative serving-quality recommendation, not a validated
-- regulatory shelf life. Reassess with the actual packaging and shelf-life testing.
UPDATE products
SET
  is_active = true,
  stock = 0,
  requires_refrigeration = false,
  storage_info = '完全放涼後密封，置於陰涼乾燥處，避免日照、熱源及潮濕；開封後請盡早食用。不需冷藏。',
  shelf_life = '建議常溫 7 天內食用（保守建議，尚未經本商品保存試驗驗證；實際賞味期限依製作日期及包裝標示）',
  updated_at = now()
WHERE slug IN (
  'original-cookie',
  'chocolate-cookie',
  'matcha-cookie',
  'six-cookie-gift-bag'
);

-- Keep the two six-pack choices visible, but unavailable until stock is entered.
UPDATE product_variants AS v
SET stock = 0, is_active = true
FROM products AS p
WHERE v.product_id = p.id
  AND p.slug = 'six-cookie-gift-bag';
