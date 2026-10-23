/**
 * 建立／更新管理員帳號
 * 使用方式（Windows PowerShell / CMD、macOS、Linux 皆相同）：
 *   node scripts/create-admin.mjs --email you@example.com --password "YourStrongPassword123" --name "店長"
 * 或改用環境變數：
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... node scripts/create-admin.mjs
 *
 * 密碼不會被記錄或輸出，資料庫只儲存 scrypt 雜湊值。
 */
import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { Client } from "pg";

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const email = (arg("email") || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = arg("password") || process.env.ADMIN_PASSWORD || "";
const name = (arg("name") || process.env.ADMIN_NAME || "唯遇甜所管理員").trim();
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("缺少 DATABASE_URL，請先在 .env 設定。");
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error("請提供有效的 --email。");
  process.exit(1);
}
if (password.length < 10) {
  console.error("管理員密碼至少需要 10 個字元，且請混合英文字母與數字。");
  process.exit(1);
}
if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  console.error("管理員密碼需同時包含英文字母與數字。");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const passwordHash = `scrypt$${salt}$${scryptSync(password.normalize("NFKC"), salt, 64).toString("hex")}`;

const client = new Client({ connectionString });
await client.connect();
try {
  const existing = await client.query("select id from users where email = $1", [email]);
  if (existing.rows[0]) {
    await client.query(
      "update users set password_hash = $1, role = 'admin', name = $2, updated_at = now() where id = $3",
      [passwordHash, name, existing.rows[0].id],
    );
    console.log(`已更新管理員帳號：${email}`);
  } else {
    await client.query(
      "insert into users (email, name, password_hash, role) values ($1,$2,$3,'admin')",
      [email, name, passwordHash],
    );
    console.log(`已建立管理員帳號：${email}`);
  }
} finally {
  await client.end();
}
