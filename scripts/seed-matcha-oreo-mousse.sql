BEGIN;

INSERT INTO products (
  slug,
  name,
  category_id,
  summary,
  description,
  price,
  stock,
  is_active,
  image_url,
  ingredients,
  internal_recipe,
  launch_at,
  allergens,
  storage_info,
  shelf_life,
  pickup_note,
  sort_order
)
VALUES (
  'matcha-oreo-mousse',
  '抹茶 Oreo 慕斯',
  (SELECT id FROM categories WHERE slug = 'chilled' LIMIT 1),
  '濃郁抹茶乳酪慕斯，搭配酥香 Oreo 餅乾底、餅乾碎與抹茶白巧克力淋面，層層口感一次滿足。',
  '免烤箱製作的抹茶 Oreo 慕斯甜點。濃郁抹茶乳酪、酥香餅乾底與抹茶白巧克力風味交織，適合抹茶控細細品嚐。',
  0,
  0,
  true,
  '/images/products/matcha-oreo-mousse.png',
  'Oreo 餅乾、無鹽奶油、奶油乳酪、砂糖、鮮奶油、抹茶粉、牛奶、吉利丁片、白巧克力。',
  $recipe$抹茶 Oreo 慕斯（6 寸模具）

【餅乾底】
Oreo 碎：200g
無鹽奶油：90g

【抹茶乳酪糊】
奶油乳酪：250g（室溫軟化）
砂糖：40g（可依喜好調整）
鮮奶油：150g
抹茶粉：10g
牛奶：60g
吉利丁片：8g
Oreo 碎：30g

【抹茶淋面】
白巧克力：80g
抹茶粉：6g
鮮奶油：50g

【製作步驟】
1. Oreo 碎與融化的無鹽奶油拌勻，鋪入模具並壓緊，冷藏備用。
2. 室溫軟化的奶油乳酪加入砂糖，攪拌至滑順無顆粒。
3. 加入鮮奶油，攪拌均勻。
4. 牛奶加熱至溫熱，加入抹茶粉攪拌至無顆粒；吉利丁片泡軟、擠乾後隔水加熱融化，再加入抹茶牛奶中拌勻。
5. 將抹茶牛奶倒入乳酪糊，攪拌均勻。
6. 拌入 30g Oreo 碎，倒入模具抹平，冷凍約 30 分鐘至凝固。
7. 鮮奶油加熱至邊緣冒泡，沖入白巧克力與抹茶粉中，靜置 5 分鐘後拌勻。
8. 淋面放涼至微溫，倒在凝固的乳酪層上並抹平。
9. 冷藏 2–3 小時定型，脫模切塊。

【製作備註】
- Oreo 可依需求換成其他餅乾；砂糖可依喜好調整或改用零卡糖。
- 建議使用日本抹茶粉；先以溫牛奶調開，較不易結塊。
- 奶油乳酪需先回溫軟化；吉利丁片以冰水泡軟、擠乾，再隔水加熱融化。
- Oreo 碎最後拌入，較能保留口感。
- 淋面需放涼至微溫再倒，避免乳酪層融化。
- 使用活底模具較容易脫模；切片時可用熱水燙刀並擦乾。
- 鮮奶油替代品、甜味劑或餅乾替換可能影響質地，製作前先小量測試。
$recipe$,
  TIMESTAMPTZ '2026-11-01 00:00:00+08',
  '含乳製品及小麥（含麩質）；其他過敏原請依實際使用的原料包裝確認。',
  '冷藏保存，面交取貨後請儘速冷藏。',
  NULL,
  '面交取貨，取貨時付款。',
  0
)
ON CONFLICT (slug) DO UPDATE
SET image_url = EXCLUDED.image_url;

COMMIT;
