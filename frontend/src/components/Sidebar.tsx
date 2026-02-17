"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "./AuthProvider";

const NAV = [
    { href: "/", label: "Floor Plan", icon: "🏢", badge: false },
    { href: "/kanban", label: "Kanban", icon: "📋", badge: false },
    { href: "/chat", label: "Chat", icon: "💬", badge: false },
    { href: "/agents", label: "Agents", icon: "🤖", badge: true },
    { href: "/activity", label: "Activity", icon: "📡", badge: false },
    { href: "/settings", label: "Settings", icon: "⚙️", badge: false },
] as const;

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { agents, connected } = useStore();
    const { user, logout } = useAuth();
    const agentCount = Object.keys(agents).length;

    return (
        <aside
            className={`hidden md:flex flex-col shrink-0 border-r border-neutral-800/50 bg-[#070707] transition-all duration-300 ${collapsed ? "w-[60px]" : "w-[220px]"
                }`}
        >
            {/* ── Top: Logo ── */}
            <div className="h-14 flex items-center px-4 border-b border-neutral-800/40">
                <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 2 L2 7 L12 12 L22 7 Z" />
                            <path d="M2 17 L12 22 L22 17" />
                            <path d="M2 12 L12 17 L22 12" />
                        </svg>
                    </div>
                    {!collapsed && (
                        <span className="text-xs font-bold tracking-[.14em] uppercase bg-gradient-to-r from-neutral-200 to-neutral-500 bg-clip-text text-transparent whitespace-nowrap">
                            DevSwarm
                        </span>
                    )}
                </Link>
            </div>

            {/* ── Nav links ── */}
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                {NAV.map((n) => {
                    const active =
                        n.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(n.href);

                    return (
                        <Link
                            key={n.href}
                            href={n.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all group ${active
                                ? "bg-violet-600/15 text-violet-300"
                                : "text-neutral-500 hover:bg-neutral-800/40 hover:text-neutral-300"
                                }`}
                        >
                            <span className="text-sm shrink-0">{n.icon}</span>
                            {!collapsed && (
                                <>
                                    <span className="truncate">{n.label}</span>
                                    {n.badge && agentCount > 0 && (
                                        <span className="ml-auto text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full tabular-nums">
                                            {agentCount}
                                        </span>
                                    )}
                                </>
                            )}
                            {active && (
                                <span className="absolute left-0 w-[3px] h-5 bg-violet-500 rounded-r-full" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* ── Bottom: Connection + User ── */}
            <div className="border-t border-neutral-800/40 p-3 space-y-2">
                {/* WS status */}
                <div
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] ${connected
                        ? "text-emerald-500/80"
                        : "text-red-500/80"
                        }`}
                >
                    <span
                        className="w-[6px] h-[6px] rounded-full shrink-0"
                        style={{
                            background: connected ? "#10b981" : "#ef4444",
                            boxShadow: connected
                                ? "0 0 6px rgba(16,185,129,.4)"
                                : "0 0 6px rgba(239,68,68,.4)",
                        }}
                    />
                    {!collapsed && <span>{connected ? "Live" : "Offline"}</span>}
                </div>

                {/* User */}
                {user && (
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
                            {user.name[0]}
                        </div>
                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-neutral-300 font-medium truncate">
                                    {user.name}
                                </p>
                                <p className="text-[9px] text-neutral-600 truncate">
                                    {user.role}
                                </p>
                            </div>
                        )}
                        {!collapsed && (
                            <button
                                onClick={logout}
                                title="Sign out"
                                className="text-neutral-600 hover:text-neutral-300 text-xs transition-colors shrink-0"
                            >
                                ↗
                            </button>
                        )}
                    </div>
                )}

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="w-full flex items-center justify-center py-1 text-neutral-700 hover:text-neutral-400 transition-colors text-xs"
                >
                    {collapsed ? "»" : "«"}
                </button>
            </div>
        </aside>
    );
}
