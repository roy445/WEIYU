-- Restore the requested catalog: three independent single-cookie products and
-- a separate six-cookie gift bag whose sellable quantity is derived from them.
-- Inventory is intentionally initialized/preserved at zero; never store bag stock.
-- Owner-supplied variable cost: NT$7 per cookie. Prices cover that cost under the
-- current fixed coupons before labor, overhead, and actual bag/packaging cost.

UPDATE products
SET is_active = false,
    stock = 0,
    updated_at = now()
WHERE slug = 'cookies';

UPDATE products
SET name = CASE slug
      WHEN 'original-cookie' THEN '原味曲奇'
      WHEN 'chocolate-cookie' THEN '巧克力曲奇'
      WHEN 'matcha-cookie' THEN '抹茶曲奇'
    END,
    price = 12,
    stock = 0,
    is_active = true,
    summary = CASE slug
      WHEN 'original-cookie' THEN '手作原味曲奇，單顆 NT$12。'
      WHEN 'chocolate-cookie' THEN '手作巧克力曲奇，單顆 NT$12。'
      WHEN 'matcha-cookie' THEN '手作抹茶曲奇，單顆 NT$12。'
    END,
    description = CASE slug
      WHEN 'original-cookie' THEN '手作原味曲奇，單顆販售。'
      WHEN 'chocolate-cookie' THEN '手作巧克力曲奇，單顆販售。'
      WHEN 'matcha-cookie' THEN '手作抹茶曲奇，單顆販售。'
    END,
    updated_at = now()
WHERE slug IN ('original-cookie', 'chocolate-cookie', 'matcha-cookie');

UPDATE products
SET name = '六入曲奇大禮袋',
    price = 90,
    stock = 0,
    is_active = true,
    summary = '六入曲奇大禮袋 NT$90，可選店家配（原味、巧克力、抹茶各 2）或客製化口味。袋數依三種口味庫存計算。',
    updated_at = now()
WHERE slug = 'six-cookie-gift-bag';

-- The gift bag's product and option stock fields are non-authoritative placeholders.
-- Availability and actual deductions/restores use the three single-flavor product stocks.
UPDATE product_variants AS v
SET stock = 0,
    price_delta = 0,
    is_active = true
FROM products AS p
WHERE v.product_id = p.id
  AND p.slug = 'six-cookie-gift-bag'
  AND v.name IN (
    '店家配（原味、巧克力、抹茶各 2）',
    '客製化（請於訂單備註填口味數量）'
  );
