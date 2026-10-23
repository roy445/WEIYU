import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 管理員可填入 https 圖片網址；本機路徑則直接讀取 public/。
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/story", destination: "/desserts", permanent: true }];
  },
};

export default nextConfig;
