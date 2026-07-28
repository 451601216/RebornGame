import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "轮回炼心",
  description: "文字轮回游戏：每一世由 LLM 书写，从生到死炼心。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Google Fonts CJK：勿用 next/font 的 latin-only 子集，否则汉字缺字/乱显 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600&family=ZCOOL+XiaoWei&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
