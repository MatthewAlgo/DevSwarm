"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

/* ── Types ── */

export interface User {
    email: string;
    name: string;
    role: "admin" | "viewer";
    avatarUrl?: string;
}

interface AuthCtx {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const Ctx = createContext<AuthCtx>({
    user: null,
    loading: true,
    login: async () => false,
    logout: () => { },
});

export const useAuth = () => useContext(Ctx);

/* ── Simulated users ── */
const USERS: Record<string, { password: string; user: User }> = {
    "admin@devswarm.io": {
        password: "admin",
        user: { email: "admin@devswarm.io", name: "Admin", role: "admin" },
    },
    "viewer@devswarm.io": {
        password: "viewer",
        user: { email: "viewer@devswarm.io", name: "Viewer", role: "viewer" },
    },
};

const STORAGE_KEY = "devswarm_user";

/* ── Provider ── */

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    /* hydrate from localStorage */
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setUser(JSON.parse(stored));
        } catch {
            /* empty */
        }
        setLoading(false);
    }, []);

    /* redirect unauthenticated to /login */
    useEffect(() => {
        if (loading) return;
        if (!user && pathname !== "/login") {
            router.replace("/login");
        }
    }, [user, loading, pathname, router]);

    const login = useCallback(
        async (email: string, password: string) => {
            // simulate network delay
            await new Promise((r) => setTimeout(r, 600));
            const entry = USERS[email.toLowerCase()];
            if (entry && entry.password === password) {
                setUser(entry.user);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(entry.user));
                router.replace("/");
                return true;
            }
            return false;
        },
        [router],
    );

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        router.replace("/login");
    }, [router]);

    return (
        <Ctx.Provider value={{ user, loading, login, logout }}>
            {children}
        </Ctx.Provider>
    );
}
