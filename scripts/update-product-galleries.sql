-- Run after deploying the matching WebP images to public/images/products.
BEGIN;

UPDATE products
SET image_url = '/images/products/weiyu_earl_grey_madeleine_packaged.webp',
    summary = '佛手柑香氣遇上蜂蜜柔甜，做成邊緣微酥、茶韻留得住的貝殼小點。',
    description = '我們把伯爵茶的佛手柑香氣和蜂蜜的圓潤甜味放進瑪德蓮，不讓茶味只停在表面；細緻茶香融進柔軟蛋糕體，貝殼邊緣烤得微酥，尾韻帶一點清爽的柑橘調。配無糖茶或黑咖啡，都能吃出它和一般奶油小蛋糕不同的層次。',
    gallery_images = (
      SELECT jsonb_agg(image ORDER BY ordinal)
      FROM (
        SELECT DISTINCT ON (image) image, ordinal
        FROM jsonb_array_elements(
          '[
      "/images/products/weiyu_earl_grey_madeleine_packaged.webp",
      "/images/products/weiyu_earl_grey_madeleine_even_arrangement.webp",
      "/images/products/madeleine.jpg"
    ]'::jsonb || COALESCE(products.gallery_images, '[]'::jsonb) || jsonb_build_array(products.image_url)
        ) WITH ORDINALITY AS existing(image, ordinal)
        WHERE image <> 'null'::jsonb
        ORDER BY image, ordinal
      ) AS retained
    )
WHERE slug = 'earl-grey-madeleine';

UPDATE products
SET image_url = '/images/products/weiyu_honey_lemon_pound_packaged.webp',
    summary = '蜂蜜蛋糕體揉進檸檬香，再以薄薄糖霜提亮酸甜，清新不膩口。',
    description = '以蜂蜜替磅蛋糕添上溫和甜香，揉入檸檬皮屑，再用帶酸度的檸檬糖霜收尾。蛋糕本體濕潤厚實，表層則清亮微酸，讓熟悉的磅蛋糕多了輕快的轉折；配茶、當午後點心都合適。',
    gallery_images = (
      SELECT jsonb_agg(image ORDER BY ordinal)
      FROM (
        SELECT DISTINCT ON (image) image, ordinal
        FROM jsonb_array_elements(
          '[
      "/images/products/weiyu_honey_lemon_pound_packaged.webp",
      "/images/products/weiyu_honey_lemon_pound_even_slices.webp",
      "/images/products/pound-cake.jpg"
    ]'::jsonb || COALESCE(products.gallery_images, '[]'::jsonb) || jsonb_build_array(products.image_url)
        ) WITH ORDINALITY AS existing(image, ordinal)
        WHERE image <> 'null'::jsonb
        ORDER BY image, ordinal
      ) AS retained
    )
WHERE slug = 'honey-lemon-pound-cake';

UPDATE products
SET image_url = '/images/products/weiyu_matcha_oreo_mousse_packaged.webp',
    summary = '抹茶乳酪的清苦、Oreo 餅乾底的酥香與白巧克力抹茶淋面，做出一層一層的口感變化。',
    description = '我們把 Oreo 不只放在底層，也拌入抹茶乳酪慕斯裡，讓每口都有餅乾脆感；上層再以抹茶白巧克力收住風味。濃郁乳酪、茶香微苦、餅乾甜脆交錯，是一款有層次、但不只有甜味的冷藏慕斯。',
    gallery_images = (
      SELECT jsonb_agg(image ORDER BY ordinal)
      FROM (
        SELECT DISTINCT ON (image) image, ordinal
        FROM jsonb_array_elements(
          '[
      "/images/products/weiyu_matcha_oreo_mousse_packaged.webp",
      "/images/products/weiyu_matcha_oreo_mousse_even_slices.webp",
      "/images/products/matcha-oreo-mousse.jpg",
      "/images/products/matcha-oreo-mousse-whole.png",
      "/images/products/matcha-oreo-mousse-slice.png",
      "/images/products/matcha-oreo-mousse-whole-and-slice.png"
    ]'::jsonb || COALESCE(products.gallery_images, '[]'::jsonb) || jsonb_build_array(products.image_url)
        ) WITH ORDINALITY AS existing(image, ordinal)
        WHERE image <> 'null'::jsonb
        ORDER BY image, ordinal
      ) AS retained
    )
WHERE slug = 'matcha-oreo-mousse';

UPDATE products
SET image_url = '/images/products/weiyu_basque_cheesecake_packaged.webp',
    summary = '把巴斯克招牌焦香烤色，和冰過後細緻綿密的乳酪中心留在同一口裡。',
    description = '這款巴斯克不只追求濃郁，而是把表面烤出帶苦甜感的焦香，中心則保留奶油乳酪與鮮奶油交織的柔軟。冰過後先是綿密，接著才慢慢散出乳酪香；讓焦香與滑順形成對比，是我們想留下的巴斯克個性。',
    gallery_images = (
      SELECT jsonb_agg(image ORDER BY ordinal)
      FROM (
        SELECT DISTINCT ON (image) image, ordinal
        FROM jsonb_array_elements(
          '[
      "/images/products/weiyu_basque_cheesecake_packaged.webp",
      "/images/products/weiyu_basque_cheesecake_even_slices.webp",
      "/images/products/basque.jpg"
    ]'::jsonb || COALESCE(products.gallery_images, '[]'::jsonb) || jsonb_build_array(products.image_url)
        ) WITH ORDINALITY AS existing(image, ordinal)
        WHERE image <> 'null'::jsonb
        ORDER BY image, ordinal
      ) AS retained
    )
WHERE slug = 'basque-cheesecake';

UPDATE products
SET image_url = '/images/products/weiyu_financier_packaged.webp',
    summary = '杏仁與可可的烘焙香，加上黑巧克力的微苦，最後用鹽之花收尾。',
    description = '費南雪原有的杏仁香，這次和可可、黑巧克力一起烘出更深的風味；奶油的堅果氣息托住巧克力的微苦，表面再以少量鹽之花提亮。入口先濃、接著帶出微鹹回甘，刻意不做成單純的甜巧克力點心。',
    gallery_images = (
      SELECT jsonb_agg(image ORDER BY ordinal)
      FROM (
        SELECT DISTINCT ON (image) image, ordinal
        FROM jsonb_array_elements(
          '[
      "/images/products/weiyu_financier_packaged.webp",
      "/images/products/weiyu_financier_even_arrangement.webp",
      "/images/products/financier.jpg"
    ]'::jsonb || COALESCE(products.gallery_images, '[]'::jsonb) || jsonb_build_array(products.image_url)
        ) WITH ORDINALITY AS existing(image, ordinal)
        WHERE image <> 'null'::jsonb
        ORDER BY image, ordinal
      ) AS retained
    )
WHERE slug = 'sea-salt-financier';

UPDATE products
SET image_url = '/images/products/weiyu_matcha_roll_packaged.webp',
    summary = '抹茶蛋糕的微苦包住柔滑奶霜，捲成輕盈、不厚重的冷藏甜點。',
    description = '把抹茶的清苦留在柔軟蛋糕體裡，再用牛奶與鮮奶油做出輕柔奶霜，捲起來形成茶香與乳香的交錯。冷藏後蛋糕體仍保有濕潤，奶霜入口清爽；不靠厚重甜味，而用抹茶的回韻做主角。',
    gallery_images = (
      SELECT jsonb_agg(image ORDER BY ordinal)
      FROM (
        SELECT DISTINCT ON (image) image, ordinal
        FROM jsonb_array_elements(
          '[
      "/images/products/weiyu_matcha_roll_packaged.webp",
      "/images/products/weiyu_matcha_roll_even_slices.webp",
      "/images/products/roll-cake.jpg"
    ]'::jsonb || COALESCE(products.gallery_images, '[]'::jsonb) || jsonb_build_array(products.image_url)
        ) WITH ORDINALITY AS existing(image, ordinal)
        WHERE image <> 'null'::jsonb
        ORDER BY image, ordinal
      ) AS retained
    )
WHERE slug = 'matcha-roll-cake';

COMMIT;
