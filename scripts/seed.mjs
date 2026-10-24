/**
 * WEIYU 唯遇甜所 — 資料庫初始化 seed
 * 執行：node scripts/seed.mjs
 *
 * 這是 idempotent 的 seed：可重複執行，不會重複建立相同 slug 的資料。
 * 商品圖片使用專案內的本機示意圖片（非真實商品照片）。
 */
import "dotenv/config";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("缺少 DATABASE_URL，請先在 .env 設定。");
  process.exit(1);
}

const categories = [
  { slug: "ambient", name: "常溫甜點", description: "適合慢慢品嚐的常溫小點。", sortOrder: 1 },
  { slug: "chilled", name: "冷藏甜點", description: "需要冷藏保存，取貨後請盡快享用。", sortOrder: 2 },
  { slug: "gift", name: "禮盒", description: "挑選好的甜點，裝成一份心意。", sortOrder: 3 },
];

const products = [
  {
    slug: "canele",
    name: "香草卡士達可麗露",
    category: "ambient",
    summary: "外層焦脆、內裡柔軟，帶著香草與蘭姆的溫暖香氣。",
    description:
      "以香草莢與蘭姆酒調製的卡士達麵糊，靜置後低溫烘烤，做出焦糖化的深色外殼與濕潤內層。建議取貨當日享用，最能感受外脆內軟的對比。\n\n【示意圖片說明】本頁照片為品牌示意圖片，實際成品外觀會依當次製作略有不同。",
    price: 95,
    stock: 42,
    imageUrl: "/images/products/canele.jpg",
    ingredients: "牛奶、雞蛋、細砂糖、低筋麵粉、奶油、香草莢、蘭姆酒",
    allergens: "含牛奶、雞蛋、麩質穀物。製程環境亦處理堅果。",
    storageInfo: "常溫陰涼處保存，避免陽光直射。",
    shelfLife: "建議取貨當日享用；未食用完請冷藏，隔日回烤後食用。",
    pickupNote: "常溫品項，面交時請盡量於約定時段內取貨。",
    variants: [
      { name: "單顆", priceDelta: 0, stock: 30 },
      { name: "六入分享盒", priceDelta: 440, stock: 12 },
    ],
  },
  {
    slug: "basque-cheesecake",
    name: "巴斯克焦香起司蛋糕",
    category: "chilled",
    summary: "把巴斯克招牌焦香烤色，和冰過後細緻綿密的乳酪中心留在同一口裡。",
    description:
      "這款巴斯克不只追求濃郁，而是把表面烤出帶苦甜感的焦香，中心則保留奶油乳酪與鮮奶油交織的柔軟。冰過後先是綿密，接著才慢慢散出乳酪香；讓焦香與滑順形成對比，是我們想留下的巴斯克個性。",
    price: 520,
    stock: 10,
    imageUrl: "/images/products/weiyu_basque_cheesecake_packaged.webp",
    galleryImages: [
      "/images/products/weiyu_basque_cheesecake_packaged.webp",
      "/images/products/weiyu_basque_cheesecake_even_slices.webp",
    ],
    ingredients: "奶油乳酪、鮮奶油、雞蛋、細砂糖、低筋麵粉",
    allergens: "含牛奶、雞蛋、麩質穀物。",
    storageInfo: "冷藏 4°C 保存，離開冷藏請勿超過 1 小時。",
    shelfLife: "冷藏建議 3 日內食用完畢。",
    pickupNote: "冷藏品項，面交時請自備保冷袋，取貨後盡快冷藏。",
    variants: [
      { name: "整模 6 吋", priceDelta: 0, stock: 6 },
      { name: "單片", priceDelta: -420, stock: 4 },
    ],
  },
  {
    slug: "earl-grey-madeleine",
    name: "伯爵茶瑪德蓮",
    category: "gift",
    summary: "佛手柑香氣遇上蜂蜜柔甜，做成邊緣微酥、茶韻留得住的貝殼小點。",
    description:
      "我們把伯爵茶的佛手柑香氣和蜂蜜的圓潤甜味放進瑪德蓮，不讓茶味只停在表面；細緻茶香融進柔軟蛋糕體，貝殼邊緣烤得微酥，尾韻帶一點清爽的柑橘調。配無糖茶或黑咖啡，都能吃出它和一般奶油小蛋糕不同的層次。",
    price: 220,
    stock: 24,
    imageUrl: "/images/products/weiyu_earl_grey_madeleine_packaged.webp",
    galleryImages: [
      "/images/products/weiyu_earl_grey_madeleine_packaged.webp",
      "/images/products/weiyu_earl_grey_madeleine_even_arrangement.webp",
    ],
    ingredients: "雞蛋、細砂糖、蜂蜜、低筋麵粉、奶油、伯爵茶葉、泡打粉",
    allergens: "含牛奶、雞蛋、麩質穀物。",
    storageInfo: "常溫陰涼處保存，可冷藏延長風味。",
    shelfLife: "常溫 2 日內食用完畢；冷藏可保存 4 日。",
    pickupNote: "禮盒包裝，適合面交時直接帶走。",
    variants: [
      { name: "五入盒", priceDelta: 0, stock: 18 },
      { name: "十入盒", priceDelta: 200, stock: 6 },
    ],
  },
  {
    slug: "sea-salt-financier",
    name: "鹽之花巧克力費南雪",
    category: "gift",
    summary: "杏仁與可可的烘焙香，加上黑巧克力的微苦，最後用鹽之花收尾。",
    description:
      "費南雪原有的杏仁香，這次和可可、黑巧克力一起烘出更深的風味；奶油的堅果氣息托住巧克力的微苦，表面再以少量鹽之花提亮。入口先濃、接著帶出微鹹回甘，刻意不做成單純的甜巧克力點心。",
    price: 260,
    stock: 18,
    imageUrl: "/images/products/weiyu_financier_packaged.webp",
    galleryImages: [
      "/images/products/weiyu_financier_packaged.webp",
      "/images/products/weiyu_financier_even_arrangement.webp",
    ],
    ingredients: "蛋白、杏仁粉、細砂糖、低筋麵粉、奶油、可可粉、黑巧克力、鹽之花",
    allergens: "含牛奶、雞蛋、堅果（杏仁）、麩質穀物。",
    storageInfo: "常溫陰涼處保存。",
    shelfLife: "常溫 3 日內食用完畢。",
    pickupNote: "含堅果，若對堅果過敏請先評估。",
    variants: [
      { name: "六入盒", priceDelta: 0, stock: 14 },
      { name: "十二入盒", priceDelta: 240, stock: 4 },
    ],
  },
  {
    slug: "matcha-roll-cake",
    name: "小山園抹茶奶霜捲",
    category: "chilled",
    summary: "抹茶蛋糕的微苦包住柔滑奶霜，捲成輕盈、不厚重的冷藏甜點。",
    description:
      "把抹茶的清苦留在柔軟蛋糕體裡，再用牛奶與鮮奶油做出輕柔奶霜，捲起來形成茶香與乳香的交錯。冷藏後蛋糕體仍保有濕潤，奶霜入口清爽；不靠厚重甜味，而用抹茶的回韻做主角。",
    price: 480,
    stock: 8,
    imageUrl: "/images/products/weiyu_matcha_roll_packaged.webp",
    galleryImages: [
      "/images/products/weiyu_matcha_roll_packaged.webp",
      "/images/products/weiyu_matcha_roll_even_slices.webp",
    ],
    ingredients: "雞蛋、細砂糖、低筋麵粉、抹茶粉、鮮奶油、牛奶",
    allergens: "含牛奶、雞蛋、麩質穀物。",
    storageInfo: "冷藏 4°C 保存。",
    shelfLife: "冷藏 2 日內食用完畢。",
    pickupNote: "冷藏品項，請自備保冷袋。",
    variants: [
      { name: "整條", priceDelta: 0, stock: 5 },
      { name: "半條", priceDelta: -250, stock: 3 },
    ],
  },
  {
    slug: "honey-lemon-pound-cake",
    name: "蜂蜜檸檬磅蛋糕",
    category: "ambient",
    summary: "蜂蜜蛋糕體揉進檸檬香，再以薄薄糖霜提亮酸甜，清新不膩口。",
    description:
      "以蜂蜜替磅蛋糕添上溫和甜香，揉入檸檬皮屑，再用帶酸度的檸檬糖霜收尾。蛋糕本體濕潤厚實，表層則清亮微酸，讓熟悉的磅蛋糕多了輕快的轉折；配茶、當午後點心都合適。",
    price: 280,
    stock: 0,
    imageUrl: "/images/products/weiyu_honey_lemon_pound_packaged.webp",
    galleryImages: [
      "/images/products/weiyu_honey_lemon_pound_packaged.webp",
      "/images/products/weiyu_honey_lemon_pound_even_slices.webp",
    ],
    ingredients: "雞蛋、細砂糖、蜂蜜、低筋麵粉、奶油、檸檬、糖粉",
    allergens: "含牛奶、雞蛋、麩質穀物。",
    storageInfo: "常溫陰涼處保存。",
    shelfLife: "常溫 3 日內食用完畢。",
    pickupNote: "目前為缺貨狀態，補貨後會重新開放。",
    variants: [{ name: "半條", priceDelta: 0, stock: 0 }],
  },
];

const pickupLocations = [
  {
    name: "範例面交地點（請由管理員修改）",
    description: "此為系統預設的示範地點，尚未設定真實面交位置。",
    notes: "這是預設資料。請登入管理後台「面交與接單設定」改成實際面交地點，再讓顧客預約。",
    sortOrder: 1,
  },
];

const settings = {
  shopName: "唯遇甜所",
  brandNameEn: "WEIYU",
  tagline: "遇見一口甜。",
  // 聯絡 Email 來自環境變數（SHOP_CONTACT_EMAIL 或 ADMIN_EMAIL）；未提供則留空，由管理員在後台填寫
  contactEmail: process.env.SHOP_CONTACT_EMAIL || process.env.ADMIN_EMAIL || null,
  contactPhone: null,
  contactSocial: null,
  pickupIntro:
    "唯遇甜所目前只提供面交取貨：在約定的時段與地點，由我親自把甜點交給你，並在取貨時付款。\n送出訂單後，我會確認庫存與面交安排，再與你聯繫。",
  orderingNotice:
    "① 選擇甜點並加入購物袋。\n② 登入會員、填寫取貨人資訊。\n③ 選擇面交地點、日期與時段後送出訂單。\n④ 等我確認訂單，確認後依約定時段面交取貨。\n⑤ 取貨時當面付款。",
  privacyNotice:
    "為處理會員註冊、訂單確認、面交聯繫及售後服務，會使用你提供的會員與訂單聯絡資料；授權店務人員僅於帳號服務、訂單處理及客服所需範圍內使用。商品頁瀏覽與成功加入購物袋次數以彙總方式計算，不建立個別會員的瀏覽或購物袋紀錄。購物袋內容儲存在你目前使用的瀏覽器中。如需詢問或提出資料相關需求，請透過頁尾聯絡方式聯繫。",
  isAcceptingOrders: true,
};

const client = new Client({ connectionString });

async function main() {
  await client.connect();
  await client.query("begin");

  for (const category of categories) {
    await client.query(
      `insert into categories (slug, name, description, sort_order)
       values ($1, $2, $3, $4)
       on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order`,
      [category.slug, category.name, category.description, category.sortOrder],
    );
  }

  for (const product of products) {
    const categoryRow = await client.query("select id from categories where slug = $1", [product.category]);
    const categoryId = categoryRow.rows[0]?.id ?? null;
    const inserted = await client.query(
      `insert into products (slug, name, category_id, summary, description, price, stock, is_active, image_url, gallery_images,
        ingredients, allergens, storage_info, shelf_life, pickup_note, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,true,$8,$9::jsonb,$10,$11,$12,$13,$14,$15)
       on conflict (slug) do update set
         name = excluded.name, category_id = excluded.category_id, summary = excluded.summary,
         description = excluded.description, image_url = excluded.image_url, gallery_images = excluded.gallery_images, ingredients = excluded.ingredients,
         allergens = excluded.allergens, storage_info = excluded.storage_info, shelf_life = excluded.shelf_life,
         pickup_note = excluded.pickup_note, updated_at = now()
       returning id`,
      [
        product.slug,
        product.name,
        categoryId,
        product.summary,
        product.description,
        product.price,
        product.stock,
        product.imageUrl,
        JSON.stringify(product.galleryImages ?? [product.imageUrl]),
        product.ingredients,
        product.allergens,
        product.storageInfo,
        product.shelfLife,
        product.pickupNote,
        0,
      ],
    );
    const productId = inserted.rows[0].id;
    const existingVariants = await client.query("select count(*)::int as count from product_variants where product_id = $1", [productId]);
    if (existingVariants.rows[0].count === 0) {
      let index = 0;
      for (const variant of product.variants) {
        await client.query(
          `insert into product_variants (product_id, name, price_delta, stock, is_active, sort_order)
           values ($1,$2,$3,$4,true,$5)`,
          [productId, variant.name, variant.priceDelta, variant.stock, index],
        );
        index += 1;
      }
    }
  }

  const existingSettings = await client.query("select count(*)::int as count from shop_settings");
  if (existingSettings.rows[0].count === 0) {
    await client.query(
      `insert into shop_settings (id, shop_name, brand_name_en, tagline, contact_email, contact_phone, contact_social,
        pickup_intro, ordering_notice, privacy_notice, is_accepting_orders)
       values (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        settings.shopName,
        settings.brandNameEn,
        settings.tagline,
        settings.contactEmail,
        settings.contactPhone,
        settings.contactSocial,
        settings.pickupIntro,
        settings.orderingNotice,
        settings.privacyNotice,
        settings.isAcceptingOrders,
      ],
    );
  } else if (settings.contactEmail) {
    // 已有設定時，只在聯絡 Email 尚未填寫的情況下補上，不覆蓋管理員後來的修改
    await client.query(
      "update shop_settings set contact_email = $1, updated_at = now() where id = 1 and (contact_email is null or contact_email = '')",
      [settings.contactEmail],
    );
  }

  const existingLocation = await client.query("select count(*)::int as count from pickup_locations");
  if (existingLocation.rows[0].count === 0) {
    const insertedLocation = await client.query(
      `insert into pickup_locations (name, description, notes, is_active, sort_order)
       values ($1,$2,$3,true,$4) returning id`,
      [pickupLocations[0].name, pickupLocations[0].description, pickupLocations[0].notes, pickupLocations[0].sortOrder],
    );
    const locationId = insertedLocation.rows[0].id;
    const today = new Date();
    for (let dayOffset = 2; dayOffset <= 5; dayOffset += 1) {
      const date = new Date(today.getTime() + dayOffset * 86400000);
      const iso = date.toISOString().slice(0, 10);
      for (const [startTime, endTime] of [
        ["14:00", "16:00"],
        ["17:00", "19:00"],
      ]) {
        await client.query(
          `insert into pickup_slots (location_id, pickup_date, start_time, end_time, capacity, is_active)
           values ($1,$2,$3,$4,$5,true)`,
          [locationId, iso, startTime, endTime, 3],
        );
      }
    }
  }

  await client.query("commit");
  const counts = await client.query(
    "select (select count(*) from products) as products, (select count(*) from categories) as categories, (select count(*) from pickup_slots) as slots, (select count(*) from users where role = 'admin') as admins",
  );
  console.log("Seed 完成：", counts.rows[0]);
  await client.end();
}

main().catch(async (error) => {
  console.error("Seed 失敗：", error);
  try {
    await client.query("rollback");
    await client.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
