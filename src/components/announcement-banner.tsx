import Link from "next/link";

type BannerAnnouncement = { id: number; title: string; body: string };

export function PinnedAnnouncement({ announcement }: { announcement: BannerAnnouncement }) {
  return (
    <aside className="sticky top-[3.4rem] z-40 border-b border-caramel/25 bg-oat-soft px-4 py-2.5 text-cocoa shadow-sm sm:top-[3.8rem]">
      <div className="container-wy flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="badge shrink-0 bg-caramel text-cream">置頂公告</span>
        <p className="min-w-0 flex-1"><strong>{announcement.title}</strong> · {announcement.body}</p>
        <Link href="/account/announcements" className="shrink-0 text-xs text-caramel-deep underline underline-offset-2">公告詳情</Link>
      </div>
    </aside>
  );
}

export function UnverifiedEmailNotice() {
  return (
    <aside aria-label="Email 尚未驗證" role="status" className="border-b border-[#D9A39A] bg-[#FFF5F3] px-4 py-3 text-[#8A4B3D]">
      <div className="container-wy flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>你的帳號尚未完成 Email 驗證，請先驗證以使用完整會員功能。</p>
        <Link href="/resend-activation" className="shrink-0 rounded-full border border-[#8A4B3D]/40 px-4 py-1.5 font-medium underline underline-offset-2">
          立即重寄驗證信
        </Link>
      </div>
    </aside>
  );
}

export function AnnouncementMarquee({ announcements }: { announcements: BannerAnnouncement[] }) {
  if (!announcements.length) return null;
  const text = announcements.map((announcement) => `${announcement.title}｜${announcement.body}`).join("　　✦　　");
  return (
    <section aria-label="首頁公告跑馬燈" className="overflow-hidden border-b border-caramel/20 bg-oat-soft/80 py-2 text-sm text-cocoa">
      <div className="announcement-marquee-track">
        <p className="announcement-marquee-content">{text}</p>
        <p className="announcement-marquee-content" aria-hidden="true">{text}</p>
      </div>
    </section>
  );
}
