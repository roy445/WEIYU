import { requireAdmin } from "@/lib/admin";
import { csvResponse } from "@/lib/csv";
import { getAdminMemberReport } from "@/lib/admin-reports";
import { getMembershipTier } from "@/lib/membership";
import { fail } from "@/lib/api";
import { formatDateTime } from "@/lib/brand";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return fail("需要管理員權限。", 403);

  try {
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
    const members = await getAdminMemberReport(query);
    return csvResponse("weiyu-members.csv", [
      ["姓名", "Email", "電話", "加入時間", "訂單數", "完成訂單累積消費", "會員等級"],
      ...members.map((member) => [
        member.name,
        member.email,
        member.phone ?? "",
        formatDateTime(member.createdAt),
        member.orderCount,
        member.completedSpend,
        getMembershipTier(member.completedSpend).current.name,
      ]),
    ]);
  } catch (error) {
    console.error("Member report export failed", error instanceof Error ? error.message : "unknown");
    return fail("無法匯出會員資料，請稍後再試。", 500);
  }
}
