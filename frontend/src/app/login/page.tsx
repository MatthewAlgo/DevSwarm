"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const ok = await login(email, password);
        if (!ok) {
            setError("Invalid credentials. Try admin@devswarm.io / admin");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-dvh flex items-center justify-center relative overflow-hidden">
            {/* ── Background ── */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-[#050505] to-indigo-950/30" />
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/8 blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/6 blur-3xl" />
                {/* Grid lines */}
                <div
                    className="absolute inset-0 opacity-[.04]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                        backgroundSize: "60px 60px",
                    }}
                />
            </div>

            {/* ── Card ── */}
            <div className="relative w-full max-w-md mx-4">
                <div className="glass border border-neutral-800/60 rounded-3xl p-8 shadow-2xl shadow-violet-900/10">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-violet-600/30 mb-4">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 2 L2 7 L12 12 L22 7 Z" />
                                <path d="M2 17 L12 22 L22 17" />
                                <path d="M2 12 L12 17 L22 12" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold tracking-[.18em] uppercase bg-gradient-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                            DevSwarm
                        </h1>
                        <p className="text-[11px] text-neutral-600 mt-1">
                            Virtual Office HQ — Sign in to continue
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@devswarm.io"
                                required
                                className="w-full bg-neutral-900/80 border border-neutral-800/60 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-violet-700/50 focus:ring-1 focus:ring-violet-700/20 transition-all"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••"
                                required
                                className="w-full bg-neutral-900/80 border border-neutral-800/60 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-violet-700/50 focus:ring-1 focus:ring-violet-700/20 transition-all"
                            />
                        </div>

                        {error && (
                            <p className="text-[11px] text-red-400 bg-red-950/30 border border-red-800/20 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-600/20"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in…
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    {/* Demo hint */}
                    <div className="mt-6 pt-5 border-t border-neutral-800/40">
                        <p className="text-[10px] text-neutral-600 text-center mb-2">
                            Demo credentials
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail("admin@devswarm.io");
                                    setPassword("admin");
                                }}
                                className="bg-neutral-900/60 border border-neutral-800/40 rounded-lg p-2 text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-300 transition-colors text-center"
                            >
                                <span className="block font-medium text-neutral-300">
                                    Admin
                                </span>
                                admin@devswarm.io
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail("viewer@devswarm.io");
                                    setPassword("viewer");
                                }}
                                className="bg-neutral-900/60 border border-neutral-800/40 rounded-lg p-2 text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-300 transition-colors text-center"
                            >
                                <span className="block font-medium text-neutral-300">
                                    Viewer
                                </span>
                                viewer@devswarm.io
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
