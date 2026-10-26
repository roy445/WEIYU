import "server-only";

import nodemailer, { type SendMailOptions } from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { ORDER_STATUS, PAYMENT_STATUS, formatPrice } from "@/lib/brand";
import { getShopSettings } from "@/lib/settings";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function getEmailLogoUrl(siteUrl: string, configuredLogoUrl: string | null): string {
  const baseUrl = new URL(siteUrl);
  const fallbackUrl = new URL("/brand/email-logo.png", baseUrl).toString();
  const candidate = configuredLogoUrl?.trim();
  if (!candidate || candidate === "/brand/logo.png" || candidate.startsWith("//")) return fallbackUrl;

  try {
    const logoUrl = new URL(candidate, baseUrl);
    if (logoUrl.protocol === "https:" || (baseUrl.protocol === "http:" && logoUrl.protocol === "http:")) {
      return logoUrl.toString();
    }
  } catch {
    // Use the built-in public logo when the configured URL is invalid.
  }
  return fallbackUrl;
}

function getEmailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;
  const fromName = process.env.SMTP_FROM_NAME || "WEIYU 唯遇甜所";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !fromEmail || !siteUrl) {
    throw new Error("SMTP 尚未設定完整。請設定 SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASSWORD、SMTP_FROM_EMAIL 與 NEXT_PUBLIC_SITE_URL。");
  }
  return {
    siteUrl,
    from: `"${fromName.replace(/["\\]/g, "")}" <${fromEmail}>`,
    transportOptions: {
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    },
  };
}

function isTransientDnsError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const candidate = current as { code?: unknown; syscall?: unknown; cause?: unknown; message?: unknown };
    const message = typeof candidate.message === "string" ? candidate.message : "";
    if (
      (candidate.syscall === "getaddrinfo" && (candidate.code === "EBUSY" || candidate.code === "EAI_AGAIN"))
      || /getaddrinfo\s+(?:EBUSY|EAI_AGAIN)\b/i.test(message)
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

async function sendMailWithRetry(transportOptions: ReturnType<typeof getEmailConfig>["transportOptions"], options: SendMailOptions): Promise<void> {
  const retryDelays = [400, 800, 1_200];
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const transport = nodemailer.createTransport(transportOptions);
    let retry = false;
    try {
      await transport.sendMail(options);
      return;
    } catch (error) {
      if (!isTransientDnsError(error) || attempt === retryDelays.length) throw error;
      retry = true;
    } finally {
      transport.close();
    }
    if (retry) await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
  }
}

export function assertEmailConfiguration(): void {
  getEmailConfig();
}

function brandedEmail(title: string, body: string, shopName: string, brandNameEn: string, logoUrl: string): string {
  return `<!doctype html>
<html lang="zh-Hant"><body style="margin:0;background:#fbf7f0;color:#543b2b;font-family:Arial,'Microsoft JhengHei',sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fbf7f0;padding:32px 12px">
<tr><td align="center"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#fffdf8;border:1px solid #e7d8c3;border-radius:16px">
<tr><td align="center" style="padding:32px 24px 18px"><img src="${escapeHtml(logoUrl)}" width="120" height="120" alt="${escapeHtml(brandNameEn)} ${escapeHtml(shopName)}" style="display:block;width:120px;height:120px;object-fit:contain;border:0;outline:none;text-decoration:none"><p style="margin:12px 0 0;color:#8a5c36;font-size:12px;letter-spacing:5px">${escapeHtml(brandNameEn)} ${escapeHtml(shopName)}</p></td></tr>
<tr><td style="padding:8px 32px 36px"><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#543b2b">${escapeHtml(title)}</h1>${body}<p style="margin:30px 0 0;border-top:1px solid #e7d8c3;padding-top:18px;color:#6f5545;font-size:12px;line-height:1.8">此郵件由 WEIYU 唯遇甜所自動寄出。若有疑問，請透過網站聯絡方式與我們聯繫。</p></td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendBrandedEmail(to: string, subject: string, title: string, body: string): Promise<void> {
  const config = getEmailConfig();
  const settings = await getShopSettings();
  await sendMailWithRetry(config.transportOptions, {
    from: config.from,
    to,
    subject,
    html: brandedEmail(
      title,
      body,
      settings.shopName,
      settings.brandNameEn,
      getEmailLogoUrl(config.siteUrl, settings.logoUrl),
    ),
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const { siteUrl } = getEmailConfig();
  const resetUrl = `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const body = `<p style="font-size:15px;line-height:1.8;color:#6f5545">我們收到重設帳號密碼的請求。請在 30 分鐘內點選下方按鈕設定新密碼；若不是你本人操作，可忽略此信。</p>
<p style="margin:26px 0"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;border-radius:999px;background:#a8754a;padding:13px 24px;color:#fffaf3;text-decoration:none;font-size:14px">重設密碼</a></p>
<p style="font-size:12px;line-height:1.7;color:#6f5545">若按鈕無法使用，請複製此網址到瀏覽器：<br><a href="${escapeHtml(resetUrl)}" style="color:#8a5c36;word-break:break-all">${escapeHtml(resetUrl)}</a></p>`;
  await sendBrandedEmail(to, "重設唯遇甜所帳號密碼", "重設你的密碼", body);
}

export async function sendEmailVerificationEmail(to: string, token: string, next?: string): Promise<void> {
  const { siteUrl } = getEmailConfig();
  const activationQuery = new URLSearchParams({ token });
  if (next && next.startsWith("/") && !next.startsWith("//")) activationQuery.set("next", next);
  const activationUrl = `${siteUrl}/activate-account?${activationQuery.toString()}`;
  const body = `<p style="font-size:15px;line-height:1.8;color:#6f5545">請在 <strong>1 小時內</strong>點選下方按鈕啟用帳號。啟用前無法登入或使用會員功能；新註冊資料若逾時未啟用，系統會自動刪除，屆時請重新註冊。</p>
<p style="margin:26px 0"><a href="${escapeHtml(activationUrl)}" style="display:inline-block;border-radius:999px;background:#a8754a;padding:13px 24px;color:#fffaf3;text-decoration:none;font-size:14px">啟用會員帳號</a></p>
<p style="font-size:12px;line-height:1.7;color:#6f5545">若按鈕無法使用，請複製此網址到瀏覽器：<br><a href="${escapeHtml(activationUrl)}" style="color:#8a5c36;word-break:break-all">${escapeHtml(activationUrl)}</a></p>
<p style="font-size:13px;line-height:1.8;color:#6f5545"><strong>如果收件匣沒有看到這封信，請檢查垃圾郵件／垃圾信件資料夾。</strong>若信件在垃圾郵件中，請將它移至收件匣，並按「回報為非垃圾郵件」或「非垃圾郵件」，之後才能順利收到帳號通知。若你沒有申請此帳號，請忽略這封信。</p>`;
  await sendBrandedEmail(to, "請啟用你的唯遇甜所會員帳號", "完成帳號啟用", body);
}

export async function sendAnnouncementEmail(
  to: string,
  title: string,
  announcementBody: string,
  announcementId: number,
): Promise<void> {
  const { siteUrl } = getEmailConfig();
  const body = `<p style="font-size:15px;line-height:1.9;color:#6f5545">${escapeHtml(announcementBody).replace(/\n/g, "<br>")}</p>
<p style="margin:26px 0"><a href="${escapeHtml(`${siteUrl}/account/announcements`)}" style="display:inline-block;border-radius:999px;background:#a8754a;padding:13px 24px;color:#fffaf3;text-decoration:none;font-size:14px">查看站內公告</a></p>
<p style="font-size:12px;line-height:1.7;color:#6f5545">公告編號：${announcementId}</p>`;
  await sendBrandedEmail(to, `WEIYU 公告｜${title}`, title, body);
}

export async function sendProductLaunchEmail(
  to: string,
  product: { name: string; slug: string; summary: string },
): Promise<void> {
  const { siteUrl } = getEmailConfig();
  const productUrl = `${siteUrl}/products/${encodeURIComponent(product.slug)}`;
  const body = `<p style="font-size:15px;line-height:1.8;color:#6f5545">你登記提醒的甜點「${escapeHtml(product.name)}」已上架，歡迎到網站查看商品資訊與訂購方式。</p>
${product.summary ? `<p style="font-size:14px;line-height:1.8;color:#6f5545">${escapeHtml(product.summary)}</p>` : ""}
<p style="margin:26px 0"><a href="${escapeHtml(productUrl)}" style="display:inline-block;border-radius:999px;background:#a8754a;padding:13px 24px;color:#fffaf3;text-decoration:none;font-size:14px">查看甜點</a></p>
<p style="font-size:12px;line-height:1.7;color:#6f5545">這封信是因你登記此商品的上架提醒而寄出，不會加入其他行銷郵件。</p>`;
  await sendBrandedEmail(to, `上架通知｜${product.name}`, `${product.name} 已上架`, body);
}

export async function sendProductTrackingEmail(
  to: string,
  product: { name: string; slug: string; changes: string[] },
): Promise<void> {
  const { siteUrl } = getEmailConfig();
  const productUrl = `${siteUrl}/products/${encodeURIComponent(product.slug)}`;
  const body = `<p style="font-size:15px;line-height:1.8;color:#6f5545">你主動開啟追蹤的商品「${escapeHtml(product.name)}」有以下變化：</p>
<ul style="font-size:14px;line-height:1.9;color:#6f5545">${product.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ul>
<p style="margin:26px 0"><a href="${escapeHtml(productUrl)}" style="display:inline-block;border-radius:999px;background:#a8754a;padding:13px 24px;color:#fffaf3;text-decoration:none;font-size:14px">查看商品</a></p>
<p style="font-size:12px;line-height:1.7;color:#6f5545">這封通知只因你主動追蹤此商品而寄出。你可在商品頁關閉追蹤或 Email 通知。</p>`;
  await sendBrandedEmail(to, `商品追蹤通知｜${product.name}`, `${product.name} 商品資訊更新`, body);
}

export async function sendOrderEmail(orderId: number, kind: "created" | "status"): Promise<void> {
  const rows = await db
    .select({ order: orders })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = rows[0]?.order;
  if (!order) throw new Error("找不到要通知的訂單。");

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const itemList = items.map((item) =>
    `<li style="margin:8px 0;color:#543b2b">${escapeHtml(item.productName)}${item.variantName ? `（${escapeHtml(item.variantName)}）` : ""} × ${item.quantity} — ${formatPrice(item.lineTotal)}</li>`,
  ).join("");
  const statusLabel = ORDER_STATUS[order.status as keyof typeof ORDER_STATUS] ?? order.status;
  const paymentLabel = PAYMENT_STATUS[order.paymentStatus as keyof typeof PAYMENT_STATUS] ?? order.paymentStatus;
  const title = kind === "created" ? "已收到你的訂單" : "訂單狀態已更新";
  const intro = kind === "created" ? "你的訂單已送出，以下是訂單摘要。店家確認後會再通知你。" : "你的訂單有新的處理進度。";
  const rewardLines = [
    `<p style="margin:0 0 6px"><strong>商品小計：</strong>${formatPrice(order.subtotal)}</p>`,
    order.couponDiscount > 0 ? `<p style="margin:0 0 6px"><strong>優惠券${order.couponTitle ? `（${escapeHtml(order.couponTitle)}）` : ""}：</strong>−${formatPrice(order.couponDiscount)}</p>` : "",
    order.pointsUsed > 0 ? `<p style="margin:0 0 6px"><strong>甜甜數折抵（${order.pointsUsed} 點）：</strong>−${formatPrice(order.pointsUsed)}</p>` : "",
  ].join("");
  const body = `<p style="font-size:15px;line-height:1.8;color:#6f5545">${intro}</p>
<div style="border-radius:10px;background:#f5eee2;padding:16px"><p style="margin:0 0 8px"><strong>訂單編號：</strong>${escapeHtml(order.orderNo)}</p><p style="margin:0 0 8px"><strong>訂單狀態：</strong>${escapeHtml(statusLabel)}</p><p style="margin:0 0 8px"><strong>付款狀態：</strong>${escapeHtml(paymentLabel)}</p><p style="margin:0"><strong>面交：</strong>${escapeHtml(order.pickupDate)} ${escapeHtml(order.pickupTime)} · ${escapeHtml(order.pickupLocationName)}</p></div>
<ul style="padding:8px 0 8px 20px;line-height:1.6">${itemList}</ul>
<div style="margin:16px 0;border-top:1px solid #e7d8c3;padding-top:12px;color:#543b2b">${rewardLines}<p style="margin:8px 0 0;font-size:14px"><strong>合計：${formatPrice(order.total)}</strong></p>${order.status === "completed" && order.pointsEarned > 0 ? `<p style="margin:8px 0 0;font-size:13px"><strong>本筆回饋甜甜數：${order.pointsEarned} 點</strong></p>` : ""}</div>
${order.adminNote?.trim() ? `<div style="margin:20px 0;border-left:3px solid #a8754a;background:#f5eee2;padding:12px 16px;color:#543b2b"><strong>店家備註</strong><p style="margin:6px 0 0;white-space:pre-line;line-height:1.7">${escapeHtml(order.adminNote.trim())}</p></div>` : ""}
<p style="font-size:12px;color:#6f5545"><a href="${escapeHtml(`${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")}/account/orders/${order.id}`)}" style="color:#8a5c36">查看訂單詳情</a></p>`;
  await sendBrandedEmail(order.contactEmail, `訂單 ${order.orderNo}｜${title}`, title, body);
}
