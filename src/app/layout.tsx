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
      </head>
      <body>{children}</body>
    </html>
  );
}
