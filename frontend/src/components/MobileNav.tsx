"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
    { href: "/", label: "Floor", icon: "🏢" },
    { href: "/kanban", label: "Kanban", icon: "📋" },
    { href: "/agents", label: "Agents", icon: "🤖" },
    { href: "/activity", label: "Activity", icon: "📡" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
] as const;

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="h-14 border-t border-neutral-800/60 bg-[#050505]/95 backdrop-blur-lg flex items-center justify-around">
            {TABS.map((t) => {
                const active =
                    t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);

                return (
                    <Link
                        key={t.href}
                        href={t.href}
                        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${active
                                ? "text-violet-400"
                                : "text-neutral-500 hover:text-neutral-300"
                            }`}
                    >
                        <span className="text-sm">{t.icon}</span>
                        <span className="text-[8px] font-semibold tracking-wider">
                            {t.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
