"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Kanban, Bot, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Floor", icon: LayoutDashboard },
  { href: "/kanban", label: "Board", icon: Kanban },
  { href: "/agents", label: "Swarm", icon: Bot },
  { href: "/activity", label: "Neural", icon: Activity },
  { href: "/settings", label: "Config", icon: Settings },
] as const;

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="h-16 border-t border-edge/50 bg-surface/95 backdrop-blur-xl flex items-center justify-around px-4">
      {TABS.map((t) => {
        const active =
          t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        const Icon = t.icon;

        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-300 relative overflow-hidden group",
                active ? "text-accent" : "text-secondary"
            )}
          >
            <Icon className={cn("w-5 h-5 transition-transform group-active:scale-90", active && "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
            <span className="text-[8px] font-heading font-bold uppercase tracking-widest">
              {t.label}
            </span>
            {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
