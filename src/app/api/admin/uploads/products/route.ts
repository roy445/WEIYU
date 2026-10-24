import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function matchesImageSignature(type: string, bytes: Buffer): boolean {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return type === "image/webp"
    && bytes.length >= 12
    && bytes.toString("ascii", 0, 4) === "RIFF"
    && bytes.toString("ascii", 8, 12) === "WEBP";
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("無法讀取上傳檔案，請重新選擇圖片。");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("請選擇一張圖片。");
  const extension = extensions[file.type];
  if (!extension) return fail("圖片無法上傳，請重新選擇後再試。");
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return fail("圖片無法上傳，請重新選擇後再試。");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!matchesImageSignature(file.type, bytes)) return fail("圖片無法上傳，請重新選擇後再試。");

  const filename = `${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "images", "products");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
    return ok({ imageUrl: `/images/products/${filename}` }, 201);
  } catch {
    return fail("圖片儲存失敗，請確認伺服器資料夾可寫入後再試。", 500);
  }
}
