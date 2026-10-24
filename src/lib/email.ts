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
    const candidate = current as { code?: unknown; syscall?: unknown; cause?: unknown };
    if (candidate.syscall === "getaddrinfo" && (candidate.code === "EBUSY" || candidate.code === "EAI_AGAIN")) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

async function sendMailWithRetry(transportOptions: ReturnType<typeof getEmailConfig>["transportOptions"], options: SendMailOptions): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const transport = nodemailer.createTransport(transportOptions);
    let retry = false;
    try {
      await transport.sendMail(options);
      return;
    } catch (error) {
      if (!isTransientDnsError(error) || attempt === 2) throw error;
      retry = true;
    } finally {
      transport.close();
    }
    if (retry) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
}

export function assertEmailConfiguration(): void {
  getEmailConfig();
}

function brandedEmail(title: string, body: string, siteUrl: string, logoUrl: string, shopName: string, brandNameEn: string): string {
  return `<!doctype html>
<html lang="zh-Hant"><body style="margin:0;background:#fbf7f0;color:#543b2b;font-family:Arial,'Microsoft JhengHei',sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fbf7f0;padding:32px 12px">
<tr><td align="center"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#fffdf8;border:1px solid #e7d8c3;border-radius:16px">
<tr><td align="center" style="padding:32px 24px 18px"><img src="${escapeHtml(logoUrl)}" width="68" height="68" alt="${escapeHtml(brandNameEn)} ${escapeHtml(shopName)}" style="display:block;width:68px;height:68px"><p style="margin:12px 0 0;color:#8a5c36;font-size:12px;letter-spacing:5px">${escapeHtml(brandNameEn)} ${escapeHtml(shopName)}</p></td></tr>
<tr><td style="padding:8px 32px 36px"><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#543b2b">${escapeHtml(title)}</h1>${body}<p style="margin:30px 0 0;border-top:1px solid #e7d8c3;padding-top:18px;color:#6f5545;font-size:12px;line-height:1.8">此郵件由 WEIYU 唯遇甜所自動寄出。若有疑問，請透過網站聯絡方式與我們聯繫。</p></td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendBrandedEmail(to: string, subject: string, title: string, body: string): Promise<void> {
  const config = getEmailConfig();
  const settings = await getShopSettings();
  const logoUrl = settings.logoUrl
    ? new URL(settings.logoUrl, `${config.siteUrl}/`).toString()
    : `${config.siteUrl}/brand/weiyu-logo.svg`;
  await sendMailWithRetry(config.transportOptions, {
    from: config.from,
    to,
    subject,
    html: brandedEmail(title, body, config.siteUrl, logoUrl, settings.shopName, settings.brandNameEn),
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
  const body = `<p style="font-size:15px;line-height:1.8;color:#6f5545">${intro}</p>
<div style="border-radius:10px;background:#f5eee2;padding:16px"><p style="margin:0 0 8px"><strong>訂單編號：</strong>${escapeHtml(order.orderNo)}</p><p style="margin:0 0 8px"><strong>訂單狀態：</strong>${escapeHtml(statusLabel)}</p><p style="margin:0 0 8px"><strong>付款狀態：</strong>${escapeHtml(paymentLabel)}</p><p style="margin:0"><strong>面交：</strong>${escapeHtml(order.pickupDate)} ${escapeHtml(order.pickupTime)} · ${escapeHtml(order.pickupLocationName)}</p></div>
<ul style="padding:8px 0 8px 20px;line-height:1.6">${itemList}</ul>
<p style="font-size:14px;color:#543b2b"><strong>合計：${formatPrice(order.total)}</strong></p>
<p style="font-size:12px;color:#6f5545"><a href="${escapeHtml(`${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")}/account/orders/${order.id}`)}" style="color:#8a5c36">查看訂單詳情</a></p>`;
  await sendBrandedEmail(order.contactEmail, `訂單 ${order.orderNo}｜${title}`, title, body);
}
