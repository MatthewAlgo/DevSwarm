"use client";

import { useAuth } from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import WSProvider from "@/components/WSProvider";
import GodMode from "@/components/GodMode";
import MobileNav from "@/components/MobileNav";
import { useStore } from "@/lib/store";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const { godMode } = useStore();

    /* auth gate — AuthProvider handles redirect, but we also prevent flash */
    if (loading || !user) {
        return (
            <div className="h-dvh flex items-center justify-center bg-background">
                <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    /* God Mode overlay */
    if (godMode) return <GodMode />;

    return (
        <WSProvider>
            <div className="h-dvh flex overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <Header />
                    <main className="flex-1 overflow-auto">{children}</main>
                    <div className="md:hidden">
                        <MobileNav />
                    </div>
                </div>
            </div>
        </WSProvider>
    );
}
