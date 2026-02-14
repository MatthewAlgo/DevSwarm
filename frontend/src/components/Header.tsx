"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useAuth } from "./AuthProvider";

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
        <header className="h-14 shrink-0 border-b border-neutral-800/60 flex items-center justify-between px-5 lg:px-8 bg-[#050505]/80 backdrop-blur-lg z-40">
            {/* ── Left: Brand (mobile) + Breadcrumb ── */}
            <div className="flex items-center gap-3">
                {/* Mobile brand */}
                <Link href="/" className="md:hidden flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2 L2 7 L12 12 L22 7 Z" />
                            <path d="M2 17 L12 22 L22 17" />
                            <path d="M2 12 L12 17 L22 12" />
                        </svg>
                    </div>
                </Link>

                {/* Breadcrumb */}
                <span className="text-xs font-medium text-neutral-400 tracking-wide">
                    {crumb}
                </span>
            </div>

            {/* ── Center: Status ── */}
            <div className="hidden sm:flex items-center gap-4 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1.5">
                    <span
                        className={`w-[7px] h-[7px] rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{
                            boxShadow: connected
                                ? "0 0 8px rgba(16,185,129,.5)"
                                : "0 0 8px rgba(239,68,68,.5)",
                        }}
                    />
                    {connected ? "Live" : "Offline"}
                </span>
                <span className="text-neutral-700">•</span>
                <span className="font-mono text-neutral-600">v{version}</span>
            </div>

            {/* ── Right: Actions ── */}
            <div className="flex items-center gap-2.5">
                {!connected && (
                    <span className="hidden sm:inline text-[10px] text-red-500/70">
                        Reconnecting…
                    </span>
                )}
                <button
                    onClick={toggleGod}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${godMode
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                            : "border border-neutral-700/60 text-neutral-400 hover:bg-neutral-800/80 hover:text-neutral-200 hover:border-neutral-600"
                        }`}
                >
                    {godMode ? "✦ God Mode" : "⚡ God Mode"}
                </button>

                {/* User avatar (desktop) — sidebar handles the full profile */}
                {user && (
                    <div className="hidden md:flex w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 items-center justify-center text-[10px] font-bold text-white">
                        {user.name[0]}
                    </div>
                )}
            </div>
        </header>
    );
}
