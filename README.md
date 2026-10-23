# WEIYU｜唯遇甜所 — 甜點面交訂購網站

> 遇見一口甜。

由學生自行規劃、小規模經營的手作甜點品牌電商。第一版只處理 **面交取貨、取貨時付款**，不含宅配、物流、線上刷卡或任何第三方金流。

## 技術架構

| 層級 | 技術 |
|---|---|
| 前端／後端 | Next.js 16（App Router、Server Components、Route Handlers）、React 19、TypeScript |
| 樣式 | Tailwind CSS 4（品牌色以 `@theme` CSS 變數統一管理）＋ 自訂 CSS 動畫（尊重 `prefers-reduced-motion`） |
| 資料庫 | PostgreSQL 16 ＋ Drizzle ORM（`src/db/schema.ts`） |
| 驗證 | 自建 Session（HttpOnly Cookie，資料庫儲存 SHA-256 token），密碼使用 Node `scrypt` 雜湊 |
| 測試 | `scripts/smoke-test.mjs`：核心端對端 API／頁面／併發測試 |

## 專案結構

```
src/
  app/
    (store)/            前台：首頁、商品、商品詳細、甜點介紹、訂購須知、服務條款、登入註冊、會員中心、結帳
    admin/              管理後台：新手步驟、訂單、商品、商品成效、會員帳號、面交與內容設定
    api/                Route Handlers：auth、products、cart、orders、account、匿名彙總統計、admin/*
  components/           LOGO、開場動畫、導覽列、購物車抽屜、商品卡、表單、後台元件
  db/                   Drizzle schema 與連線
  lib/                  auth、orders（交易與庫存）、products、settings、brand 常數
scripts/
  seed.mjs              可重複執行的 seed（分類、示範商品、商店設定、示範面交時段）
  create-admin.mjs      建立／更新管理員（密碼來自參數或環境變數，不寫死）
  smoke-test.mjs        核心流程自動化測試
public/
  images/               品牌示意圖片（AI 生成示意圖，非真實商品照片）
  brand/weiyu-logo.svg  完整 LOGO（SVG 重製版）
```

## 在 Windows（VS Code）啟動

### 1. 安裝需求
- Node.js 20 以上
- Docker Desktop（用來跑 PostgreSQL），或自行安裝 PostgreSQL 16

### 2. 啟動資料庫
在專案根目錄開啟終端機（PowerShell）：

```powershell
docker compose up -d
```

沒有 Docker 的替代方案：安裝 PostgreSQL 後建立資料庫 `app_db`，並把 `.env` 的 `DATABASE_URL` 改成你的帳號密碼。

### 3. 設定環境變數

```powershell
Copy-Item .env.example .env
```

.env 的 DATABASE_URL 是網站、Drizzle 與 seed 共用的資料庫連線。使用 Docker 時保留範例中的本機連線；使用 Neon 等雲端資料庫時，請改成服務提供的完整連線字串，避免建表和匯入資料連到不同資料庫。

### 4. 安裝套件、建立資料表、匯入示範資料

```powershell
npm install
npm run db:push     # 依 src/db/schema.ts 建立／更新資料表（drizzle-kit push）
npm run db:seed     # 匯入分類、示範商品、商店設定與示範面交時段（可重複執行）
```

### 5. 建立管理員帳號（密碼請自行決定，至少 10 碼且含英文與數字）

```powershell
node scripts/create-admin.mjs --email you@example.com --password "你的強密碼" --name "店長"
```

若已在 `.env` 填好 `ADMIN_EMAIL`／`ADMIN_NAME`，也可只在當次指令提供密碼：

```powershell
$env:ADMIN_PASSWORD="你的強密碼"; npm run db:admin
```

沒有任何預設管理員密碼；再次執行同一個 Email 會更新密碼並確保角色為 admin。
登入後可在「會員中心 → 變更密碼」自行更換（管理員至少 10 碼），更換後其他裝置會自動登出。
`.env` 的 `SHOP_CONTACT_EMAIL` 會在 seed 時寫入商店聯絡 Email（顯示於頁尾與訂購須知），之後可於後台修改。

### 6. 開發模式啟動

```powershell
npm run dev
```

開啟 <http://localhost:3000>。

### 7. 正式建置與啟動

```powershell
npm run build
npm run start
```

## 測試

```powershell
npm run typecheck
npm run lint
npm run build
# 另開終端機先啟動網站（npm run dev 或 npm run start），再執行：
$env:BASE_URL="http://localhost:3000"; $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="你的強密碼"; npm run test:smoke
```

煙霧測試會建立臨時會員與訂單並在結束時清理；涵蓋註冊／登入／登出、未登入保護、伺服器價格驗證、庫存扣除、重複送出防護、併發搶購、權限隔離、管理員狀態流轉與取消恢復庫存等。

## 登入與操作

- 前台：首頁 → 全部甜點 → 商品詳細 → 加入購物袋 → 結帳（需登入）→ 選擇面交地點／日期／時段 → 送出訂單 → 會員中心查看進度。
- 後台：使用管理員帳號登入後，導覽列會出現「管理後台」；網址為 `/admin`。總覽頁提供初次設定步驟；「客製化中心」集中前台說明、條款與 FAQ，並提供分開的商品、會員、成效和面交設定入口。商品成效以彙總次數顯示瀏覽與加入購物袋，不保存個別會員的瀏覽或購物袋紀錄。
  - **面交與接單設定**：新增真實面交地點與時段。seed 內的地點名為「範例面交地點（請由管理員修改）」，請改成實際地點。
  - **商品管理**：新增／編輯／上下架／庫存／規格／成分與過敏原。可在商品編輯視窗從電腦上傳 JPG、PNG 或 WebP 圖片（最大 5 MB）。
  - **會員帳號**：以姓名或 Email 搜尋帳號並查看訂單數，從會員資料頁連結到訂單清單。
  - **訂單管理**：確認 → 完成取貨；面交收款後再標記「已付款」；取消會恢復庫存（僅一次）。
  - **商店內容與設定**：品牌、聯絡方式、LOGO、接單狀態、服務條款、FAQ 與注意事項。
- 會員可在「會員中心 → 會員資料」修改顯示名稱、聯絡電話、頭像、暖色預設頭像配色與淺／深色主題。登入 Email 作為帳號識別，目前無法直接修改。
- 註冊須分別勾選同意服務條款及確認已閱讀隱私權告知；伺服器會拒絕未同意的註冊，並記錄各自的確認時間。
- 前台說明已分成 `/ordering`、`/pickup`、`/faq`、`/privacy`、`/terms` 獨立頁面；頁尾可分別前往。
- 會員中心可上傳頭像、裁切與縮放；頭像圖片儲存至 Cloudinary，需設定 `CLOUDINARY_CLOUD_NAME`、`CLOUDINARY_API_KEY`、`CLOUDINARY_API_SECRET`。
- 忘記密碼及訂單成立／狀態通知透過 SMTP 寄送。請在 `.env` 設定 `SMTP_HOST`、`SMTP_PORT`、`SMTP_SECURE`、`SMTP_USER`、`SMTP_PASSWORD`、`SMTP_FROM_EMAIL`、`SMTP_FROM_NAME`，並設定公開可連線的 `NEXT_PUBLIC_SITE_URL`。Gmail 請使用應用程式密碼；Email 會使用商店目前設定的 Logo 與品牌名稱。
- 訂單狀態更新後會自動寄送通知；訂單詳情頁亦可手動重寄。若 SMTP 寄送失敗，訂單狀態仍會保存，後台會提示失敗並可稍後重寄。

商品圖片上傳會寫入執行網站的 `public/images/products/` 資料夾，適用本機開發或有持久磁碟的自架主機。Vercel 等無伺服器部署不保證本機檔案持久保存，正式部署前商品圖片也應改接 Cloudinary、S3 等物件儲存服務。會員頭像目前直接使用 Cloudinary。

## LOGO 顯示位置與使用你的 LOGO 圖檔

LOGO 會出現在：首次進站的開場動畫、**每次切換頁面的品牌過場**（點擊站內連結立即顯示，至少停留 0.6 秒後淡出）、各頁面的載入畫面、導覽列、首頁主視覺印章、登入／註冊／結帳提示卡與頁尾。所有動態效果都尊重 `prefers-reduced-motion`。

把品牌 LOGO 原圖（PNG／SVG）放到 `public/brand/`（例如 `public/brand/weiyu-logo.png`），到後台「商店設定」的「完整 LOGO 圖片網址」填入 `/brand/weiyu-logo.png`，開場動畫、頁面過場與登入頁即會改用該圖片；導覽列固定使用內建依品牌規格重製的 SVG 標誌，以確保縮小後仍清晰。

## 安全與資料規則

- 密碼僅儲存 scrypt 雜湊；Session Cookie 為 HttpOnly、SameSite=Lax、正式環境 Secure。
- 所有管理 API 與頁面均在伺服器驗證 `role === "admin"`；會員只能讀取自己的訂單。
- 訂單建立在單一資料庫交易中完成：鎖定商品與時段、條件式扣庫存（不可為負）、檢查時段容量、以 `clientRequestId` 去重。
- 訂單明細保存下單時的商品名稱、規格與單價快照；金額一律為整數新台幣。
- 新訂單付款狀態固定為「尚未付款」，只有管理員可改為「已付款」。
- 登入與下單 API 有基本速率限制。

## 正式上線前需要設定

| 項目 | 說明 |
|---|---|
| `DATABASE_URL` | 正式 PostgreSQL 連線字串（建議啟用 SSL） |
| `NEXT_PUBLIC_SITE_URL` | 正式網域，供 Open Graph／canonical 使用 |
| SMTP 設定 | 重設密碼、訂單成立與訂單狀態通知所需的 SMTP 主機與寄件帳號 |
| Cloudinary 設定 | 會員頭像裁切上傳所需的 Cloud name、API key、API secret |
| 管理員帳號 | 於正式資料庫執行 `node scripts/create-admin.mjs ...` |
| 面交地點與時段 | 後台設定實際地點；刪除／停用 seed 的範例地點 |
| 聯絡方式 | 後台商店設定填寫 Email／電話／社群 |
| 商品照片 | 以真實商品照片取代 `public/images/products/` 內的示意圖 |
| 部署 | 任一支援 Node.js 的平台（Vercel、Railway、Render、自架 VPS）；資料庫可用 Neon／Supabase／RDS 等 PostgreSQL 服務 |
| 速率限制 | 目前為單一實例記憶體限流；多實例部署時建議改用 Redis 或平台層限流 |

Drizzle 設定會從 .env 讀取 DATABASE_URL；正式環境請使用該環境的 PostgreSQL 連線字串，不要沿用本機或範例帳密。
