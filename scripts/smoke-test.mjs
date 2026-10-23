/**
 * WEIYU 核心流程煙霧測試（針對正在執行的伺服器）
 * 用法：BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/smoke-test.mjs
 *
 * 測試項目：
 *  1. 頁面可讀取（首頁／商品／商品詳細／訂購須知／登入）
 *  2. 註冊、登入、登出、未登入保護
 *  3. 購物袋驗證 API 以伺服器價格為準
 *  4. 建立訂單會扣庫存、相同 clientRequestId 不會重複建立
 *  5. 併發搶購最後庫存時只有符合庫存的訂單成功
 *  6. 一般會員不能呼叫管理 API；會員不能讀取他人訂單
 *  7. 管理員確認／完成／標記付款／取消訂單，取消會恢復庫存且僅一次
 *  8. 管理員可新增／編輯商品與面交設定
 */
import "dotenv/config";
import { Client } from "pg";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const results = [];
function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(name, condition, detail = "") {
  record(name, Boolean(condition), condition ? "" : detail);
}

function cookieJar() {
  const jar = new Map();
  return {
    headers() {
      return jar.size ? { cookie: Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ") } : {};
    },
    absorb(response) {
      const raw = response.headers.getSetCookie?.() ?? [];
      for (const line of raw) {
        const [pair, ...attrs] = line.split(";");
        const [key, value] = pair.split("=");
        const maxAgeZero = attrs.some((a) => a.trim().toLowerCase() === "max-age=0");
        if (maxAgeZero || value === "") jar.delete(key.trim());
        else jar.set(key.trim(), value);
      }
    },
  };
}

async function call(jar, path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...jar.headers(), ...(init.headers ?? {}) },
    redirect: "manual",
  });
  jar.absorb(response);
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers };
}

const db = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await db.connect();
  const stamp = Date.now();

  // 1. 頁面
  for (const path of ["/", "/products", "/products?q=可麗露&sort=price_asc", "/desserts", "/ordering", "/pickup", "/faq", "/privacy", "/terms", "/login", "/register", "/forgot-password", "/reset-password", "/products/canele", "/checkout"]) {
    const res = await fetch(`${BASE}${path}`);
    const html = await res.text();
    assert(`GET ${path} 200`, res.status === 200, `status ${res.status}`);
    assert(`${path} 不使用「我們」`, !html.includes("我們"));
    if (path === "/") {
      assert("首頁包含品牌名稱與標語", html.includes("唯遇甜所") && html.includes("遇見一口甜"));
      assert("首頁不含禁用字詞", !/Pâtisserie|WEI SWEET/i.test(html));
      assert("首頁導覽包含「甜點介紹」且不含「品牌故事」", html.includes("甜點介紹") && !html.includes("品牌故事"));
    }
  }
  const storyRedirect = await fetch(`${BASE}/story`, { redirect: "manual" });
  assert(
    "/story 轉址到 /desserts",
    storyRedirect.status >= 300 && storyRedirect.status < 400 && (storyRedirect.headers.get("location") || "").includes("/desserts"),
    `status ${storyRedirect.status}`,
  );
  assert("不存在的商品回傳 404", (await fetch(`${BASE}/products/not-a-real-slug`)).status === 404);

  // 2. 會員註冊／登入
  const customer = cookieJar();
  const email = `tester+${stamp}@example.com`;
  let res = await call(customer, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "測試會員",
      email,
      password: "Tester1234",
      passwordConfirm: "Tester1234",
      termsAccepted: true,
      privacyAcknowledged: true,
    }),
  });
  assert("註冊成功", res.status === 201 && res.data.ok, JSON.stringify(res.data));
  res = await call(cookieJar(), "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "未同意會員", email: `no-consent+${stamp}@example.com`, password: "Tester1234", passwordConfirm: "Tester1234" }),
  });
  assert("未同意服務條款與隱私告知的註冊被拒", res.status === 400);
  res = await call(cookieJar(), "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "測試會員", email, password: "Tester1234", passwordConfirm: "Tester1234", termsAccepted: true, privacyAcknowledged: true }),
  });
  assert("重複 Email 註冊被拒", res.status === 409);
  res = await call(cookieJar(), "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "弱密碼", email: `weak+${stamp}@example.com`, password: "12345678", passwordConfirm: "12345678", termsAccepted: true, privacyAcknowledged: true }),
  });
  assert("弱密碼註冊被拒", res.status === 400);
  res = await call(cookieJar(), "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "wrong-pass1" }) });
  assert("錯誤密碼登入失敗", res.status === 401);

  const hashRow = await db.query("select password_hash from users where email = $1", [email]);
  assert("密碼以 scrypt 雜湊儲存", hashRow.rows[0]?.password_hash?.startsWith("scrypt$") && !hashRow.rows[0].password_hash.includes("Tester1234"));

  // 2b. 變更密碼
  res = await call(customer, "/api/account/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword: "wrong-pass1", newPassword: "Tester5678", newPasswordConfirm: "Tester5678" }),
  });
  assert("目前密碼錯誤時無法變更密碼", res.status === 401);
  res = await call(customer, "/api/account/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword: "Tester1234", newPassword: "Tester5678", newPasswordConfirm: "Tester5678" }),
  });
  assert("變更密碼成功", res.status === 200 && res.data.ok, JSON.stringify(res.data));
  res = await call(cookieJar(), "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "Tester1234" }) });
  assert("舊密碼無法登入", res.status === 401);
  res = await call(cookieJar(), "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "Tester5678" }) });
  assert("新密碼可登入", res.status === 200);
  res = await call(customer, "/api/orders", { method: "GET" });
  assert("變更密碼後目前 Session 仍有效", res.status === 200);

  // 3. 未登入保護
  const anon = cookieJar();
  res = await call(anon, "/api/orders", { method: "POST", body: JSON.stringify({ items: [] }) });
  assert("未登入無法建立訂單", res.status === 401);
  res = await call(anon, "/api/admin/products", { method: "GET" });
  assert("未登入無法呼叫管理 API", res.status === 403);
  const accountPage = await fetch(`${BASE}/account`, { redirect: "manual" });
  assert("未登入進入會員中心會被導向登入", accountPage.status >= 300 && accountPage.status < 400);

  // 4. 購物袋驗證：伺服器價格
  const product = (await db.query("select id, slug, name, price, stock from products where slug = 'canele'")).rows[0];
  const variant = (await db.query("select id, name, price_delta, stock from product_variants where product_id = $1 order by sort_order limit 1", [product.id])).rows[0];
  res = await call(customer, "/api/cart", { method: "POST", body: JSON.stringify({ items: [{ productId: product.id, variantId: variant.id, quantity: 2 }] }) });
  assert("購物袋 API 回傳伺服器價格", res.data.ok && res.data.lines[0].unitPrice === product.price + variant.price_delta, JSON.stringify(res.data));

  // 面交時段
  const slot = (await db.query("select s.id, s.capacity from pickup_slots s join pickup_locations l on l.id = s.location_id where s.is_active and l.is_active and s.pickup_date >= current_date order by s.pickup_date limit 1")).rows[0];
  assert("存在可預約時段（seed）", Boolean(slot));

  // 5. 建立訂單
  const requestId = `smoke-${stamp}`;
  const orderBody = {
    items: [{ productId: product.id, variantId: variant.id, quantity: 2 }],
    pickupSlotId: slot.id,
    contactName: "測試會員",
    contactPhone: "0912345678",
    contactEmail: email,
    note: "煙霧測試訂單",
    clientRequestId: requestId,
  };
  res = await call(customer, "/api/orders", { method: "POST", body: JSON.stringify(orderBody) });
  assert("建立訂單成功", res.status === 201 && res.data.ok && res.data.orderNo, JSON.stringify(res.data));
  const orderId = res.data.orderId;
  const afterStock = (await db.query("select stock from products where id = $1", [product.id])).rows[0].stock;
  assert("庫存已扣除 2", afterStock === product.stock - 2, `${product.stock} → ${afterStock}`);
  const afterVariant = (await db.query("select stock from product_variants where id = $1", [variant.id])).rows[0].stock;
  assert("規格庫存已扣除 2", afterVariant === variant.stock - 2);
  const orderRow = (await db.query("select status, payment_status, payment_method, total from orders where id = $1", [orderId])).rows[0];
  assert("新訂單狀態為待確認／尚未付款／面交付款", orderRow.status === "pending_confirmation" && orderRow.payment_status === "unpaid" && orderRow.payment_method === "cash_on_pickup");
  assert("訂單總額由伺服器計算", orderRow.total === (product.price + variant.price_delta) * 2, `total=${orderRow.total}`);

  // 同一 requestId 重送
  res = await call(customer, "/api/orders", { method: "POST", body: JSON.stringify(orderBody) });
  assert("相同 clientRequestId 不重複建立訂單", res.status === 200 && res.data.alreadyExisted && res.data.orderId === orderId, JSON.stringify(res.data));
  const stillStock = (await db.query("select stock from products where id = $1", [product.id])).rows[0].stock;
  assert("重送不再扣庫存", stillStock === afterStock);

  // 價格竄改：傳入 price 欄位應被忽略
  res = await call(customer, "/api/orders", {
    method: "POST",
    body: JSON.stringify({ ...orderBody, clientRequestId: `${requestId}-b`, items: [{ productId: product.id, variantId: null, quantity: 1, price: 1 }] }),
  });
  const tampered = (await db.query("select total from orders where id = $1", [res.data.orderId])).rows[0];
  assert("前端價格被忽略，總額依資料庫", res.status === 201 && tampered.total === product.price, `total=${tampered?.total}`);
  const secondOrderId = res.data.orderId;

  // 6. 併發搶購：將某商品庫存設為 1，三個請求同時搶
  const scarce = (await db.query("select id from products where slug = 'sea-salt-financier'")).rows[0];
  await db.query("update products set stock = 1 where id = $1", [scarce.id]);
  const racers = await Promise.all(
    [1, 2, 3].map((n) =>
      call(customer, "/api/orders", {
        method: "POST",
        body: JSON.stringify({ ...orderBody, items: [{ productId: scarce.id, variantId: null, quantity: 1 }], clientRequestId: `${requestId}-race-${n}` }),
      }),
    ),
  );
  const successes = racers.filter((r) => r.status === 201).length;
  const conflicts = racers.filter((r) => r.status === 409).length;
  const scarceStock = (await db.query("select stock from products where id = $1", [scarce.id])).rows[0].stock;
  assert("併發搶購僅 1 筆成功、其餘 409", successes === 1 && conflicts === 2, `success=${successes} conflict=${conflicts}`);
  assert("庫存不為負數", scarceStock === 0, `stock=${scarceStock}`);
  const raceOrderId = racers.find((r) => r.status === 201)?.data.orderId;

  // 缺貨商品
  const outOfStock = (await db.query("select id, name from products where stock <= 0 and is_active limit 1")).rows[0];
  res = await call(customer, "/api/orders", {
    method: "POST",
    body: JSON.stringify({ ...orderBody, items: [{ productId: outOfStock.id, variantId: null, quantity: 1 }], clientRequestId: `${requestId}-oos` }),
  });
  assert("缺貨商品無法下單", res.status === 409, JSON.stringify(res.data));

  // 7. 權限：一般會員不能管理、不能看他人訂單
  res = await call(customer, `/api/admin/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ action: "mark_paid" }) });
  assert("一般會員不能呼叫管理 API", res.status === 403);
  const other = cookieJar();
  await call(other, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "另一位", email: `other+${stamp}@example.com`, password: "Other12345", passwordConfirm: "Other12345", termsAccepted: true, privacyAcknowledged: true }),
  });
  const otherPage = await fetch(`${BASE}/account/orders/${orderId}`, { headers: other.headers(), redirect: "manual" });
  assert("會員不能讀取他人訂單頁（404）", otherPage.status === 404, `status ${otherPage.status}`);
  const ownPage = await fetch(`${BASE}/account/orders/${orderId}`, { headers: customer.headers(), redirect: "manual" });
  assert("會員可讀取自己的訂單頁", ownPage.status === 200);

  // 8. 管理員流程
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log("– 管理員流程：未提供 ADMIN_EMAIL / ADMIN_PASSWORD，本次略過（不計入失敗）");
  } else {
    const admin = cookieJar();
    res = await call(admin, "/api/auth/login", { method: "POST", body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }) });
    assert("管理員登入", res.status === 200 && res.data.user?.role === "admin", JSON.stringify(res.data));
    const adminHome = await fetch(`${BASE}/admin`, { headers: admin.headers(), redirect: "manual" });
    assert("管理員可進入後台", adminHome.status === 200);
    const customerAdmin = await fetch(`${BASE}/admin`, { headers: customer.headers(), redirect: "manual" });
    const customerAdminHtml = await customerAdmin.text();
    assert("一般會員進入後台顯示權限不足", customerAdminHtml.includes("權限不足"));

    res = await call(admin, `/api/admin/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ action: "complete" }) });
    assert("待確認訂單不可直接完成", res.status === 409);
    res = await call(admin, `/api/admin/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ action: "confirm" }) });
    assert("管理員確認訂單", res.status === 200 && res.data.status === "confirmed");
    res = await call(admin, `/api/admin/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ action: "mark_paid" }) });
    assert("管理員標記已付款", res.status === 200 && res.data.paymentStatus === "paid");
    res = await call(admin, `/api/admin/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ action: "complete" }) });
    assert("管理員完成訂單", res.status === 200 && res.data.status === "completed");
    res = await call(admin, `/api/admin/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) });
    assert("已完成訂單不可取消", res.status === 409);

    // 取消 second order → 恢復庫存一次
    const before = (await db.query("select stock from products where id = $1", [product.id])).rows[0].stock;
    res = await call(admin, `/api/admin/orders/${secondOrderId}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) });
    assert("管理員取消待確認訂單", res.status === 200 && res.data.status === "cancelled");
    const restored = (await db.query("select stock from products where id = $1", [product.id])).rows[0].stock;
    assert("取消後庫存恢復 1", restored === before + 1, `${before} → ${restored}`);
    res = await call(admin, `/api/admin/orders/${secondOrderId}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) });
    const restoredAgain = (await db.query("select stock from products where id = $1", [product.id])).rows[0].stock;
    assert("重複取消被拒且庫存不重複恢復", res.status === 409 && restoredAgain === restored);

    if (raceOrderId) {
      res = await call(admin, `/api/admin/orders/${raceOrderId}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) });
      const scarceRestored = (await db.query("select stock from products where id = $1", [scarce.id])).rows[0].stock;
      assert("取消搶購訂單後庫存恢復為 1", scarceRestored === 1, `stock=${scarceRestored}`);
    }

    const logs = await db.query("select count(*)::int as c from admin_action_logs where target_id = $1", [String(orderId)]);
    assert("管理操作已寫入操作紀錄", logs.rows[0].c >= 3, `logs=${logs.rows[0].c}`);

    // 商品管理
    res = await call(admin, "/api/admin/products", {
      method: "POST",
      body: JSON.stringify({ name: `測試商品 ${stamp}`, price: 120, stock: 5, summary: "測試用", imageUrl: "/images/products/canele.jpg", variants: [{ name: "一入", priceDelta: 0, stock: 5 }] }),
    });
    assert("管理員新增商品", res.status === 201 && res.data.product?.id, JSON.stringify(res.data));
    const newProductId = res.data.product?.id;
    res = await call(admin, `/api/admin/products/${newProductId}`, { method: "PATCH", body: JSON.stringify({ price: 150, isActive: false }) });
    const updated = (await db.query("select price, is_active from products where id = $1", [newProductId])).rows[0];
    assert("管理員編輯商品（價格／下架）", res.status === 200 && updated.price === 150 && updated.is_active === false);
    res = await call(admin, "/api/admin/products", { method: "POST", body: JSON.stringify({ name: "壞圖片", price: 10, stock: 1, imageUrl: "javascript:alert(1)" }) });
    assert("不安全圖片網址被拒", res.status === 400);
    res = await call(admin, `/api/admin/products/${newProductId}`, { method: "DELETE" });
    assert("管理員刪除未使用的商品", res.status === 200 && res.data.archived === false);

    // 面交設定
    res = await call(admin, "/api/admin/pickup", { method: "POST", body: JSON.stringify({ type: "location", name: `測試地點 ${stamp}`, notes: "測試" }) });
    assert("新增面交地點", res.status === 201 && res.data.id);
    const locId = res.data.id;
    const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    res = await call(admin, "/api/admin/pickup", { method: "POST", body: JSON.stringify({ type: "slot", locationId: locId, pickupDate: future, startTime: "10:00", endTime: "12:00", capacity: 2 }) });
    assert("新增面交時段", res.status === 201 && res.data.id);
    const slotId = res.data.id;
    res = await call(admin, "/api/admin/pickup", { method: "POST", body: JSON.stringify({ type: "slot", locationId: locId, pickupDate: future, startTime: "12:00", endTime: "11:00", capacity: 2 }) });
    assert("結束早於開始的時段被拒", res.status === 400);
    res = await call(admin, "/api/admin/pickup", { method: "PATCH", body: JSON.stringify({ type: "slot", id: slotId, isActive: false }) });
    assert("關閉時段", res.status === 200);
    res = await call(customer, "/api/orders", {
      method: "POST",
      body: JSON.stringify({ ...orderBody, pickupSlotId: slotId, items: [{ productId: product.id, variantId: null, quantity: 1 }], clientRequestId: `${requestId}-closed` }),
    });
    assert("關閉的時段不可預約", res.status === 409);
    res = await call(admin, "/api/admin/pickup", { method: "DELETE", body: JSON.stringify({ type: "location", id: locId }) });
    assert("刪除測試地點", res.status === 200);

    // 商店設定
    res = await call(admin, "/api/admin/settings/accepting", { method: "PATCH", body: JSON.stringify({ isAcceptingOrders: false }) });
    assert("暫停接單", res.status === 200);
    res = await call(customer, "/api/orders", {
      method: "POST",
      body: JSON.stringify({ ...orderBody, items: [{ productId: product.id, variantId: null, quantity: 1 }], clientRequestId: `${requestId}-paused` }),
    });
    assert("暫停接單時無法下單", res.status === 409);
    res = await call(admin, "/api/admin/settings/accepting", { method: "PATCH", body: JSON.stringify({ isAcceptingOrders: true }) });
    assert("恢復接單", res.status === 200);
  }

  // 登出
  res = await call(customer, "/api/auth/logout", { method: "POST" });
  res = await call(customer, "/api/orders", { method: "GET" });
  assert("登出後無法讀取訂單", res.status === 401);

  // 清理測試資料
  await db.query("delete from orders where contact_email = $1", [email]);
  await db.query("delete from users where email like $1", [`%+${stamp}@example.com`]);
  await db.query("update products set stock = 18 where slug = 'sea-salt-financier'");
  await db.query("update products set stock = $1 where id = $2", [product.stock, product.id]);
  await db.query("update product_variants set stock = $1 where id = $2", [variant.stock, variant.id]);
  await db.end();

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} 項通過`);
  if (failed.length) {
    console.log("失敗項目：");
    for (const f of failed) console.log(` - ${f.name}${f.detail ? `：${f.detail}` : ""}`);
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error("測試執行失敗：", error);
  try {
    await db.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
