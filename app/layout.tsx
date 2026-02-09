import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AnimatedShaderBackground from "@/components/animated-shader-background";

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
        {/* Animated shader background */}
        <AnimatedShaderBackground />

        {/* Subtle noise overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Main content */}
        <div className="relative flex flex-col h-screen z-10">
          <Navbar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
