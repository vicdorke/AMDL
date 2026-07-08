import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AMDL - Apple Music Downloader",
  description: "一个美观的 Apple Music 下载工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex">
        <Sidebar />
        <main className="ml-56 flex-1 min-h-screen p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
