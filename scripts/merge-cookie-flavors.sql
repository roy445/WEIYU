-- Merge the three single-flavor listings into one product with selectable variants.
-- The six-cookie gift bag remains its own product/listing.
-- Shelf-life guidance consulted: Taiwan FDA food-label shelf-life assessment guidance
-- (product-specific evaluation is needed):
-- https://foodlabel.fda.gov.tw/FdaFrontEndApp/Law/Edit?SystemId=8c7448e2-fe00-4ae2-9b17-1e3caede9fe8&clPublishStatus=1
-- USDA's general cookie storage guidance gives 2-3 weeks at room temperature;
-- this site's 7-day recommendation is deliberately shorter but is NOT validated testing:
-- https://ask.fsis.usda.gov/article/How-should-cookies-be-stored

INSERT INTO products (
  slug, name, category_id, summary, description, price, stock, is_active,
  image_url, gallery_images, ingredients, allergens, internal_recipe,
  requires_refrigeration, storage_info, shelf_life, sort_order
)
SELECT
  'cookies',
  '曲奇',
  1,
  '原味、巧克力、抹茶三種口味可選，單顆 NT$8。點進商品選擇口味；單顆照與包裝照都在商品圖庫。',
  '手作擠花曲奇，單顆 NT$8。請先選擇原味、巧克力或抹茶口味。商品圖庫依口味展示單顆與包裝樣式。',
  8,
  0,
  true,
  '/images/products/butter-cookie.png',
  '["/images/products/butter-cookie.png","/images/products/butter-cookie-bagged.png","/images/products/chocolate-cookie.png","/images/products/chocolate-cookie-bagged.png","/images/products/matcha-cookie.png","/images/products/matcha-cookie-bagged.png"]'::jsonb,
  '依口味：無鹽奶油、糖粉、雞蛋、低筋麵粉、可可粉或抹茶粉。',
  '乳製品、蛋、含麩質穀物（小麥）。',
  (
    SELECT string_agg(
      CASE slug
        WHEN 'original-cookie' THEN '【原味】'
        WHEN 'chocolate-cookie' THEN '【巧克力】'
        WHEN 'matcha-cookie' THEN '【抹茶】'
      END || E'\n' || COALESCE(internal_recipe, ''),
      E'\n\n'
      ORDER BY CASE slug WHEN 'original-cookie' THEN 1 WHEN 'chocolate-cookie' THEN 2 ELSE 3 END
    )
    FROM products
    WHERE slug IN ('original-cookie','chocolate-cookie','matcha-cookie')
  ),
  false,
  '完全放涼後密封，置於陰涼乾燥處，避免日照、熱源及潮濕；開封後請盡早食用。不需冷藏。',
  '建議常溫 7 天內食用（保守建議，尚未經本商品保存試驗驗證；實際賞味期限依製作日期及包裝標示）',
  89
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = 0,
  is_active = true,
  image_url = EXCLUDED.image_url,
  gallery_images = EXCLUDED.gallery_images,
  ingredients = EXCLUDED.ingredients,
  allergens = EXCLUDED.allergens,
  internal_recipe = EXCLUDED.internal_recipe,
  requires_refrigeration = false,
  storage_info = EXCLUDED.storage_info,
  shelf_life = EXCLUDED.shelf_life,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Historical single-flavor product rows remain in the database but are hidden from listings.
UPDATE products
SET is_active = false, stock = 0, updated_at = now()
WHERE slug IN ('original-cookie','chocolate-cookie','matcha-cookie');

-- Each flavor has independent inventory; all begin at zero (sold out).
INSERT INTO product_variants (product_id, name, price_delta, stock, is_active, sort_order)
SELECT p.id, flavor.name, 0, 0, true, flavor.sort_order
FROM products AS p
CROSS JOIN (VALUES ('原味',0),('巧克力',1),('抹茶',2)) AS flavor(name, sort_order)
WHERE p.slug = 'cookies'
  AND NOT EXISTS (
    SELECT 1 FROM product_variants AS existing
    WHERE existing.product_id = p.id AND existing.name = flavor.name
  );

-- Keep the six-cookie gift bag as a separate product with only its own bag photo.
UPDATE products
SET name = '六入曲奇大禮袋',
    summary = '六入曲奇大禮袋 NT$40，可選店家配（原味、巧克力、抹茶各 2）或客製化口味。',
    image_url = '/images/products/six-cookie-tied-bag.png',
    gallery_images = '[]'::jsonb,
    stock = 0,
    is_active = true,
    requires_refrigeration = false,
    storage_info = '完全放涼後密封，置於陰涼乾燥處，避免日照、熱源及潮濕；開封後請盡早食用。不需冷藏。',
    shelf_life = '建議常溫 7 天內食用（保守建議，尚未經本商品保存試驗驗證；實際賞味期限依製作日期及包裝標示）',
    updated_at = now()
WHERE slug = 'six-cookie-gift-bag';

UPDATE product_variants AS v
SET stock = 0, is_active = true
FROM products AS p
WHERE v.product_id = p.id AND p.slug = 'six-cookie-gift-bag';
