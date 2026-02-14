"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { AgentDot, StatusBadge } from "./AgentAvatar";
import KanbanBoard from "./KanbanBoard";

export default function GodMode() {
    const { agents, toggleGod, messages, tasks, connected, costs, version } =
        useStore();
    const [goal, setGoal] = useState("");
    const [busy, setBusy] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [tab, setTab] = useState<"overview" | "kanban" | "costs">("overview");

    const list = Object.values(agents);

    const push = useCallback(
        (m: string) =>
            setLog((p) =>
                [`[${new Date().toLocaleTimeString()}] ${m}`, ...p].slice(0, 80),
            ),
        [],
    );

    /* ── handlers ── */

    const trigger = async () => {
        if (!goal.trim()) return;
        setBusy(true);
        push(`▶ Triggering: "${goal}"`);
        try {
            await api.triggerGoal(goal);
            push("✅ Goal triggered");
            setGoal("");
        } catch (e) {
            push(`❌ ${e}`);
        }
        setBusy(false);
    };

    const override = async (status: string, room: string) => {
        push(`⚡ Override → ${status} / ${room}`);
        try {
            await api.overrideState({
                global_status: status,
                default_room: room,
                message: `God Mode: ${status}`,
            });
            push(`✅ State overridden`);
        } catch (e) {
            push(`❌ ${e}`);
        }
    };

    const demo = async () => {
        push("▶ Starting demo day…");
        try {
            await api.simulateDemoDay();
            push("✅ Demo day started");
        } catch (e) {
            push(`❌ ${e}`);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#030303] z-50 overflow-auto"
        >
            {/* ── Header ── */}
            <div className="h-14 sticky top-0 border-b border-violet-900/20 flex items-center justify-between px-6 bg-[#030303]/90 backdrop-blur-lg z-50">
                <div className="flex items-center gap-3">
                    <span className="text-violet-400 text-lg">✦</span>
                    <h1 className="text-xs font-bold text-violet-300 tracking-[.2em] uppercase">
                        God Mode
                    </h1>
                </div>

                {/* Tabs */}
                <div className="hidden sm:flex items-center gap-1 bg-neutral-900/80 rounded-lg p-0.5">
                    {(["overview", "kanban", "costs"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all ${tab === t
                                    ? "bg-violet-600 text-white"
                                    : "text-neutral-500 hover:text-neutral-300"
                                }`}
                        >
                            {t[0].toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                <button
                    onClick={toggleGod}
                    className="px-3 py-1.5 rounded-lg text-[11px] bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 transition-colors border border-neutral-700/40"
                >
                    × Exit
                </button>
            </div>

            <div className="max-w-[1400px] mx-auto p-5 lg:p-8">
                {/* ── Overview Tab ── */}
                {tab === "overview" && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                        {/* Main area */}
                        <div className="space-y-6">
                            {/* Stats bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <StatCard
                                    label="Agents"
                                    value={list.length}
                                    sub="total"
                                    color="text-violet-400"
                                />
                                <StatCard
                                    label="Working"
                                    value={list.filter((a) => a.status === "Working").length}
                                    sub="active"
                                    color="text-emerald-400"
                                />
                                <StatCard
                                    label="Tasks"
                                    value={tasks.length}
                                    sub="tracked"
                                    color="text-sky-400"
                                />
                                <StatCard
                                    label="Messages"
                                    value={messages.length}
                                    sub="inter-agent"
                                    color="text-amber-400"
                                />
                            </div>

                            {/* Agent grid */}
                            <Section title="Agent States">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {list.map((a) => (
                                        <div
                                            key={a.id}
                                            className="bg-neutral-900/60 border border-neutral-800/40 rounded-xl p-3 space-y-2 hover:border-neutral-700/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <AgentDot agent={a} size={28} />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-neutral-200 truncate">
                                                        {a.name}
                                                    </p>
                                                    <p className="text-[9px] text-neutral-600 truncate">
                                                        {a.role}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <StatusBadge status={a.status} />
                                            </div>
                                            <div className="text-[9px] text-neutral-600 space-y-0.5">
                                                <p className="truncate">{a.room}</p>
                                                {a.currentTask && (
                                                    <p className="text-neutral-500 truncate">
                                                        ↳ {a.currentTask}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Section>

                            {/* Command console */}
                            <Section title="Command Console">
                                <div className="space-y-3">
                                    {/* Goal trigger */}
                                    <div className="flex gap-2">
                                        <input
                                            value={goal}
                                            onChange={(e) => setGoal(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && trigger()}
                                            placeholder="Enter a goal for Marco to orchestrate…"
                                            className="flex-1 bg-neutral-900/80 border border-neutral-800/50 rounded-xl px-4 py-2.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-violet-700/50 focus:ring-1 focus:ring-violet-700/25 transition-all"
                                        />
                                        <button
                                            onClick={trigger}
                                            disabled={busy || !goal.trim()}
                                            className="px-5 py-2.5 bg-violet-600 text-white text-xs font-medium rounded-xl hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-600/20"
                                        >
                                            {busy ? "…" : "Trigger"}
                                        </button>
                                    </div>

                                    {/* Quick actions */}
                                    <div className="flex flex-wrap gap-2">
                                        <QuickAction
                                            label="▶ Demo Day"
                                            cls="bg-sky-950/40 text-sky-400 border-sky-800/25"
                                            onClick={demo}
                                        />
                                        <QuickAction
                                            label="🕘 Clock In"
                                            cls="bg-emerald-950/40 text-emerald-400 border-emerald-800/25"
                                            onClick={() => override("Idle", "Desks")}
                                        />
                                        <QuickAction
                                            label="🕔 Clock Out"
                                            cls="bg-amber-950/40 text-amber-400 border-amber-800/25"
                                            onClick={() => override("Clocked Out", "Lounge")}
                                        />
                                        <QuickAction
                                            label="⚔️ War Room"
                                            cls="bg-violet-950/40 text-violet-400 border-violet-800/25"
                                            onClick={() => override("Meeting", "War Room")}
                                        />
                                        <QuickAction
                                            label="🔄 Simulate"
                                            cls="bg-neutral-800/40 text-neutral-400 border-neutral-700/25"
                                            onClick={async () => {
                                                push("▶ Simulating activity…");
                                                try {
                                                    await api.simulateActivity();
                                                    push("✅ Activity simulated");
                                                } catch (e) {
                                                    push(`❌ ${e}`);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </Section>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-5">
                            {/* Connection */}
                            <div className="flex items-center gap-2.5 p-3.5 bg-neutral-900/60 rounded-xl border border-neutral-800/40">
                                <span
                                    className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
                                    style={{
                                        boxShadow: connected
                                            ? "0 0 8px rgba(16,185,129,.5)"
                                            : "0 0 8px rgba(239,68,68,.5)",
                                    }}
                                />
                                <span className="text-[10px] text-neutral-400">
                                    WebSocket: {connected ? "Connected" : "Disconnected"}
                                </span>
                                <span className="ml-auto text-[10px] text-neutral-600 font-mono">
                                    v{version}
                                </span>
                            </div>

                            {/* Console log */}
                            <Section title="Console">
                                <div className="bg-neutral-950/80 border border-neutral-800/30 rounded-xl p-3 h-[340px] overflow-y-auto font-mono">
                                    {log.length === 0 ? (
                                        <p className="text-neutral-800 text-[10px]">
                                            Awaiting commands…
                                        </p>
                                    ) : (
                                        log.map((e, i) => (
                                            <p
                                                key={i}
                                                className="text-[10px] leading-relaxed text-neutral-500"
                                            >
                                                {e}
                                            </p>
                                        ))
                                    )}
                                </div>
                            </Section>
                        </div>
                    </div>
                )}

                {/* ── Kanban Tab ── */}
                {tab === "kanban" && (
                    <div className="mt-2">
                        <KanbanBoard />
                    </div>
                )}

                {/* ── Costs Tab ── */}
                {tab === "costs" && (
                    <div className="mt-2">
                        <Section title="Agent Costs">
                            {costs.length === 0 ? (
                                <p className="text-neutral-600 text-xs">
                                    No cost data available yet.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {costs.map((c) => (
                                        <div
                                            key={c.agentId}
                                            className="bg-neutral-900/60 border border-neutral-800/40 rounded-xl p-3"
                                        >
                                            <p className="text-xs font-medium text-neutral-300">
                                                {c.agentId}
                                            </p>
                                            <p className="text-lg font-bold text-emerald-400 mt-1">
                                                ${c.totalCost.toFixed(4)}
                                            </p>
                                            <p className="text-[9px] text-neutral-600 mt-0.5">
                                                {c.totalInput + c.totalOutput} tokens
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/* ── Helpers ── */

function StatCard({
    label,
    value,
    sub,
    color,
}: {
    label: string;
    value: number;
    sub: string;
    color: string;
}) {
    return (
        <div className="bg-neutral-900/60 border border-neutral-800/40 rounded-xl p-4">
            <p className="text-[9px] text-neutral-600 uppercase tracking-wider">
                {label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-[9px] text-neutral-700">{sub}</p>
        </div>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[.12em] mb-3">
                {title}
            </h3>
            {children}
        </div>
    );
}

function QuickAction({
    label,
    cls,
    onClick,
}: {
    label: string;
    cls: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-3.5 py-1.5 text-[10px] font-medium border rounded-lg transition-all hover:brightness-125 ${cls}`}
        >
            {label}
        </button>
    );
}
