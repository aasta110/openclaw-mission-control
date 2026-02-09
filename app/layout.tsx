import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AI Command Center",
  description: "AI Agent Task Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-void">
        {/* Ambient background effects (macOS-like: no cyber grid) */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Soft gradient tints */}
          <div className="absolute -top-40 left-1/3 w-[720px] h-[720px] rounded-full blur-[140px]" style={{ background: 'rgba(10,132,255,0.10)' }} />
          <div className="absolute -bottom-52 right-1/4 w-[640px] h-[640px] rounded-full blur-[140px]" style={{ background: 'rgba(191,90,242,0.08)' }} />

          {/* Subtle noise overlay */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Main content */}
        <div className="relative flex flex-col h-screen z-10">
          <Navbar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
