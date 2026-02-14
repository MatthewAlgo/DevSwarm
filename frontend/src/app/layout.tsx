import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevSwarm — Virtual Office HQ",
  description:
    "Real-time multi-agent virtual office powered by LangGraph, MCP & Go WebSockets",
  keywords: ["AI", "Multi-Agent", "LangGraph", "MCP", "DevSwarm"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505] text-neutral-100`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
