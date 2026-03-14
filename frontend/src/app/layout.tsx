import type { Metadata } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
        className={`${orbitron.variable} ${exo2.variable} antialiased bg-[#050505] text-neutral-100 font-body`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
