"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

export default function SettingsPage() {
    const { connected, version, agents, costs } = useStore();
    const { user, logout } = useAuth();
    const agentCount = Object.keys(agents).length;
    const workingCount = Object.values(agents).filter(
        (a) => a.status === "Working",
    ).length;

    const [wsUrl, setWsUrl] = useState(
        process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws",
    );
    const [apiUrl, setApiUrl] = useState(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api",
    );
    const [simResult, setSimResult] = useState("");

    const handleSimulate = async (
        type: "activity" | "demo",
        label: string,
    ) => {
        setSimResult(`Running ${label}…`);
        try {
            if (type === "activity") await api.simulateActivity();
            else await api.simulateDemoDay();
            setSimResult(`✅ ${label} completed`);
        } catch (e) {
            setSimResult(`❌ Failed: ${e}`);
        }
    };

    return (
        <div className="p-5 lg:p-8 space-y-8 max-w-3xl">
            <div>
                <h1 className="text-sm font-bold text-neutral-200 tracking-wider uppercase">
                    Settings
                </h1>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                    Configuration, diagnostics &amp; simulation controls
                </p>
            </div>

            {/* ── Account ── */}
            <Section title="Account">
                <div className="flex items-center justify-between bg-neutral-900/60 border border-neutral-800/40 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
                            {user?.name?.[0] ?? "?"}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-neutral-200">
                                {user?.name}
                            </p>
                            <p className="text-[10px] text-neutral-500">{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-md bg-violet-950/40 text-violet-400 font-medium">
                            {user?.role}
                        </span>
                        <button
                            onClick={logout}
                            className="text-[11px] text-neutral-500 hover:text-red-400 transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </Section>

            {/* ── Connection ── */}
            <Section title="Connection">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-neutral-900/60 border border-neutral-800/40 rounded-xl p-4">
                        <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                                background: connected ? "#10b981" : "#ef4444",
                                boxShadow: connected
                                    ? "0 0 8px rgba(16,185,129,.4)"
                                    : "0 0 8px rgba(239,68,68,.4)",
                            }}
                        />
                        <div className="flex-1">
                            <p className="text-xs text-neutral-300">
                                WebSocket: {connected ? "Connected" : "Disconnected"}
                            </p>
                            <p className="text-[10px] text-neutral-600">
                                State version {version}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <SettingInput
                            label="WebSocket URL"
                            value={wsUrl}
                            onChange={setWsUrl}
                            mono
                        />
                        <SettingInput
                            label="API URL"
                            value={apiUrl}
                            onChange={setApiUrl}
                            mono
                        />
                    </div>
                    <p className="text-[9px] text-neutral-700">
                        Changes require environment variable update &amp; restart.
                    </p>
                </div>
            </Section>

            {/* ── Diagnostics ── */}
            <Section title="Diagnostics">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <DiagCard label="Agents" value={agentCount} />
                    <DiagCard
                        label="Working"
                        value={workingCount}
                        color="text-emerald-400"
                    />
                    <DiagCard label="Costs" value={costs.length} />
                    <DiagCard
                        label="Status"
                        value={connected ? "OK" : "ERR"}
                        color={connected ? "text-emerald-400" : "text-red-400"}
                    />
                </div>

                {/* Cost table */}
                {costs.length > 0 && (
                    <div className="mt-4 bg-neutral-900/60 border border-neutral-800/40 rounded-xl overflow-hidden">
                        <table className="w-full text-[10px]">
                            <thead>
                                <tr className="border-b border-neutral-800/40">
                                    <th className="text-left px-3 py-2 text-neutral-600 font-semibold uppercase tracking-wider">
                                        Agent
                                    </th>
                                    <th className="text-right px-3 py-2 text-neutral-600 font-semibold uppercase tracking-wider">
                                        Input
                                    </th>
                                    <th className="text-right px-3 py-2 text-neutral-600 font-semibold uppercase tracking-wider">
                                        Output
                                    </th>
                                    <th className="text-right px-3 py-2 text-neutral-600 font-semibold uppercase tracking-wider">
                                        Cost
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {costs.map((c) => (
                                    <tr
                                        key={c.agentId}
                                        className="border-b border-neutral-800/20"
                                    >
                                        <td className="px-3 py-2 text-neutral-400">{c.agentId}</td>
                                        <td className="px-3 py-2 text-right text-neutral-500 font-mono">
                                            {c.totalInput}
                                        </td>
                                        <td className="px-3 py-2 text-right text-neutral-500 font-mono">
                                            {c.totalOutput}
                                        </td>
                                        <td className="px-3 py-2 text-right text-emerald-400 font-mono">
                                            ${c.totalCost.toFixed(4)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>

            {/* ── Simulation ── */}
            <Section title="Simulation Controls">
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <SimButton
                            label="▶ Simulate Activity"
                            cls="bg-sky-950/40 text-sky-400 border-sky-800/25"
                            onClick={() => handleSimulate("activity", "Activity Simulation")}
                        />
                        <SimButton
                            label="🎬 Demo Day"
                            cls="bg-violet-950/40 text-violet-400 border-violet-800/25"
                            onClick={() => handleSimulate("demo", "Demo Day")}
                        />
                    </div>
                    {simResult && (
                        <p className="text-[10px] text-neutral-500 bg-neutral-900/50 rounded-lg p-2 font-mono">
                            {simResult}
                        </p>
                    )}
                </div>
            </Section>

            {/* ── About ── */}
            <Section title="About">
                <div className="bg-neutral-900/60 border border-neutral-800/40 rounded-xl p-4 space-y-1 text-[10px] text-neutral-600">
                    <p>
                        <span className="text-neutral-400">DevSwarm</span> · Virtual Office
                        HQ
                    </p>
                    <p>Next.js 16 · React 19 · Tailwind v4 · Zustand 5</p>
                    <p>Go Backend · Python AI Engine (LangGraph + MCP)</p>
                </div>
            </Section>
        </div>
    );
}

/* ── Helpers ── */

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <h2 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[.12em] mb-3">
                {title}
            </h2>
            {children}
        </div>
    );
}

function SettingInput({
    label,
    value,
    onChange,
    mono,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    mono?: boolean;
}) {
    return (
        <div>
            <label className="block text-[9px] text-neutral-600 uppercase tracking-wider mb-1">
                {label}
            </label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full bg-neutral-900/80 border border-neutral-800/50 rounded-lg px-3 py-2 text-[11px] text-neutral-300 focus:outline-none focus:border-violet-700/40 ${mono ? "font-mono" : ""}`}
            />
        </div>
    );
}

function DiagCard({
    label,
    value,
    color = "text-neutral-200",
}: {
    label: string;
    value: number | string;
    color?: string;
}) {
    return (
        <div className="bg-neutral-900/60 border border-neutral-800/40 rounded-xl p-3">
            <p className="text-[9px] text-neutral-600 uppercase tracking-wider">
                {label}
            </p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}

function SimButton({
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
            className={`px-4 py-2 text-[10px] font-medium border rounded-lg transition-all hover:brightness-125 ${cls}`}
        >
            {label}
        </button>
    );
}
