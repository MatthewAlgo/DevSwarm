"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "./AuthProvider";
import { LayoutDashboard, Kanban, MessageSquare, Bot, Activity, Settings, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Floor Plan", icon: LayoutDashboard, badge: false },
  { href: "/kanban", label: "Kanban", icon: Kanban, badge: false },
  { href: "/chat", label: "Chat", icon: MessageSquare, badge: false },
  { href: "/agents", label: "Agents", icon: Bot, badge: true },
  { href: "/activity", label: "Activity", icon: Activity, badge: false },
  { href: "/settings", label: "Settings", icon: Settings, badge: false },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { agents, connected } = useStore();
  const { user, logout } = useAuth();
  const agentCount = Object.keys(agents).length;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 border-r border-edge bg-surface transition-all duration-300",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* ── Top: Logo ── */}
      <div className="h-14 flex items-center px-4 border-b border-edge/50">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <svg
              width="18"
              height="18"
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
            <span className="text-sm font-heading font-bold tracking-[.1em] text-foreground whitespace-nowrap">
              DevSwarm
            </span>
          )}
        </Link>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar">
        {NAV.map((n) => {
          const active =
            n.href === "/"
              ? pathname === "/"
              : pathname.startsWith(n.href);

          const Icon = n.icon;

          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative cursor-pointer",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-secondary hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0 transition-colors", active ? "text-accent" : "text-secondary group-hover:text-foreground")} />
              {!collapsed && (
                <>
                  <span className="truncate">{n.label}</span>
                  {n.badge && agentCount > 0 && (
                    <span className="ml-auto text-[10px] bg-surface-3 text-secondary px-1.5 py-0.5 rounded-full tabular-nums border border-edge/50">
                      {agentCount}
                    </span>
                  )}
                </>
              )}
              {active && (
                <span className="absolute left-[-8px] w-[4px] h-6 bg-accent rounded-r-full shadow-[0_0_8px_rgba(59,130,246,.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: Connection + User ── */}
      <div className="border-t border-edge/50 p-3 space-y-3">
        {/* WS status */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold",
            connected ? "bg-ok/10 text-ok" : "bg-err/10 text-err"
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              connected ? "bg-ok animate-status-pulse" : "bg-err"
            )}
          />
          {!collapsed && <span>{connected ? "Live Connection" : "Offline Mode"}</span>}
        </div>

        {/* User */}
        {user && (
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-accent to-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {user.name[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground font-bold truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-secondary truncate">
                  {user.role}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                title="Sign out"
                className="text-secondary hover:text-err transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
          className="w-full flex items-center justify-center py-2 text-secondary hover:text-foreground transition-colors cursor-pointer border border-edge/30 rounded-lg hover:bg-surface-2"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
