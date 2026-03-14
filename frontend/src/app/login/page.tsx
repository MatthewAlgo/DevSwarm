"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Shield, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
            setError("AUTHENTICATION_FAILED: INVALID_CREDENTIALS");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-dvh flex items-center justify-center relative overflow-hidden bg-background font-sans">
            {/* ── Background ── */}
            <div className="absolute inset-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[100px]" />
                
                {/* Subtle Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
                
                {/* Grid */}
                <div
                    className="absolute inset-0 opacity-[.03]"
                    style={{
                        backgroundImage:
                            "linear-gradient(var(--color-edge) 1px, transparent 1px), linear-gradient(90deg, var(--color-edge) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />
            </div>

            {/* ── Login Card ── */}
            <div className="relative w-full max-w-md mx-4 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-violet-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition-opacity" />
                
                <div className="relative bg-surface-2/80 backdrop-blur-2xl border border-edge rounded-[2rem] p-10 shadow-2xl">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center mb-10 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] mb-6 relative">
                            <Shield className="w-8 h-8 text-white relative z-10" />
                            <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse" />
                        </div>
                        <h1 className="text-xl font-heading font-bold tracking-[.3em] uppercase text-foreground mb-2">
                            DevSwarm_HQ
                        </h1>
                        <p className="text-[10px] text-secondary font-bold uppercase tracking-widest opacity-60">
                            Neural Swarm Command Interface
                        </p>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="block text-[9px] font-heading font-bold text-secondary uppercase tracking-[.2em] ml-1"
                            >
                                Ident_Protocol (Email)
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="node_admin@devswarm.io"
                                    required
                                    className="w-full bg-surface-3 border border-edge rounded-xl pl-12 pr-4 py-4 text-xs text-foreground placeholder:text-secondary/20 focus:outline-none focus:border-accent/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="block text-[9px] font-heading font-bold text-secondary uppercase tracking-[.2em] ml-1"
                            >
                                Access_Key (Password)
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    required
                                    className="w-full bg-surface-3 border border-edge rounded-xl pl-12 pr-4 py-4 text-xs text-foreground placeholder:text-secondary/20 focus:outline-none focus:border-accent/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-err/5 border border-err/20 rounded-xl px-4 py-3 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-err animate-pulse" />
                                <p className="text-[10px] text-err font-bold uppercase tracking-tighter">
                                    {error}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group relative flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-heading font-bold uppercase tracking-[.2em] bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-accent/20 cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <span>Initialize_Link</span>
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick Access / Demo */}
                    <div className="mt-10 pt-8 border-t border-edge/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-edge/50" />
                            <span className="text-[9px] font-heading font-bold text-secondary uppercase tracking-widest">
                                Authorized_Nodes
                            </span>
                            <div className="flex-1 h-px bg-edge/50" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail("admin@devswarm.io");
                                    setPassword("admin");
                                }}
                                className="bg-surface-3 border border-edge rounded-xl p-3 text-left hover:border-accent/40 hover:bg-surface-2 transition-all cursor-pointer group"
                            >
                                <span className="block text-[10px] font-bold text-foreground group-hover:text-accent transition-colors uppercase mb-1">
                                    Admin_Root
                                </span>
                                <span className="text-[8px] font-mono text-secondary uppercase tracking-tighter">
                                    Full_System_Control
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail("viewer@devswarm.io");
                                    setPassword("viewer");
                                }}
                                className="bg-surface-3 border border-edge rounded-xl p-3 text-left hover:border-ok/40 hover:bg-surface-2 transition-all cursor-pointer group"
                            >
                                <span className="block text-[10px] font-bold text-foreground group-hover:text-ok transition-colors uppercase mb-1">
                                    Guest_Node
                                </span>
                                <span className="text-[8px] font-mono text-secondary uppercase tracking-tighter">
                                    Read_Only_Access
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Footer Meta */}
                <div className="mt-8 flex items-center justify-between px-4">
                    <span className="text-[8px] font-mono text-secondary/40 uppercase">DevSwarm_Protocol_v2.4.0</span>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-ok" />
                        <span className="text-[8px] font-mono text-secondary/40 uppercase">Secure_Handshake_Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
