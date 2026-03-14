"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils";
import { Zap, Shield, Wifi, WifiOff } from "lucide-react";

export default function Header() {
  const { connected, godMode, toggleGod, version } = useStore();
  const { user } = useAuth();
  const pathname = usePathname();

  /* Derive breadcrumb from pathname */
  const crumb =
    pathname === "/"
      ? "Floor Plan"
      : pathname.slice(1).replace(/\//g, " › ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <header className="h-14 shrink-0 border-b border-edge/50 flex items-center justify-between px-5 lg:px-8 bg-surface/80 backdrop-blur-lg z-40">
      {/* ── Left: Brand (mobile) + Breadcrumb ── */}
      <div className="flex items-center gap-4">
        {/* Mobile brand */}
        <Link href="/" className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L2 7 L12 12 L22 7 Z" />
              <path d="M2 17 L12 22 L22 17" />
              <path d="M2 12 L12 17 L22 12" />
            </svg>
          </div>
        </Link>

        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-[10px] font-heading font-bold uppercase tracking-widest text-secondary">
          <span className="hover:text-foreground transition-colors cursor-pointer">DevSwarm</span>
          <span>/</span>
          <span className="text-foreground">{crumb}</span>
        </nav>
      </div>

      {/* ── Center: Status ── */}
      <div className="hidden sm:flex items-center gap-6 text-[10px] font-bold uppercase tracking-tighter">
        <div className={cn("flex items-center gap-2 transition-colors", connected ? "text-ok" : "text-err")}>
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{connected ? "System Online" : "System Offline"}</span>
        </div>
        <div className="flex items-center gap-2 text-secondary">
          <span className="w-1 h-1 rounded-full bg-secondary/30" />
          <span className="font-mono">BUILD v{version}</span>
        </div>
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-4">
        {!connected && (
          <span className="hidden sm:inline text-[10px] text-err/70 animate-pulse font-bold uppercase">
            Attempting Handshake…
          </span>
        )}
        <button
          onClick={toggleGod}
          className={cn(
            "group relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border cursor-pointer",
            godMode
              ? "bg-accent border-accent text-white shadow-[0_0_15px_rgba(59,130,246,.4)]"
              : "bg-surface-2 border-edge text-secondary hover:border-accent hover:text-foreground"
          )}
        >
          {godMode ? <Shield className="w-3 h-3 fill-current" /> : <Zap className="w-3 h-3 group-hover:text-accent" />}
          <span>{godMode ? "GOD_MODE ACTIVE" : "ENABLE GOD_MODE"}</span>
          {godMode && <span className="absolute inset-0 rounded-lg animate-ping bg-accent/20 pointer-events-none" />}
        </button>

        {/* User avatar (desktop) — sidebar handles the full profile */}
        {user && (
          <div className="hidden md:flex w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-violet-600 items-center justify-center text-xs font-bold text-white shadow-sm border border-white/10">
            {user.name[0]}
          </div>
        )}
      </div>
    </header>
  );
}
