"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function ActivityPage() {
    const { messages, agents, activity, setActivity } = useStore();
    const [tab, setTab] = useState<"messages" | "log">("messages");

    /* fetch activity log on mount */
    useEffect(() => {
        api
            .getActivity(100)
            .then((data) => setActivity(data))
            .catch(() => { });
    }, [setActivity]);

    return (
        <div className="p-5 lg:p-8 space-y-5 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-bold text-neutral-200 tracking-wider uppercase">
                        Activity
                    </h1>
                    <p className="text-[11px] text-neutral-600 mt-0.5">
                        Inter-agent messages &amp; system events
                    </p>
                </div>

                <div className="flex gap-1 bg-neutral-900/80 rounded-lg p-0.5">
                    {(["messages", "log"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all ${tab === t
                                    ? "bg-violet-600 text-white"
                                    : "text-neutral-500 hover:text-neutral-300"
                                }`}
                        >
                            {t === "messages" ? "Messages" : "Event Log"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages tab */}
            {tab === "messages" && (
                <div className="space-y-2">
                    {messages.length === 0 ? (
                        <EmptyState icon="💬" text="No messages yet" />
                    ) : (
                        messages.map((m, i) => {
                            const from = agents[m.fromAgent];
                            const to = agents[m.toAgent];
                            return (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="flex gap-3 bg-neutral-900/50 border border-neutral-800/40 rounded-xl p-3"
                                >
                                    {/* From avatar */}
                                    <div
                                        className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-[10px] font-bold"
                                        style={{
                                            background: from
                                                ? `${from.avatarColor}20`
                                                : "rgba(255,255,255,0.05)",
                                            color: from?.avatarColor ?? "#666",
                                        }}
                                    >
                                        {from?.name?.[0] ?? "?"}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[11px] font-medium text-neutral-300">
                                                {from?.name ?? m.fromAgent}
                                            </span>
                                            <span className="text-[9px] text-neutral-700">→</span>
                                            <span className="text-[11px] text-neutral-500">
                                                {to?.name ?? m.toAgent}
                                            </span>
                                            <span className="ml-auto text-[8px] text-neutral-700 font-mono">
                                                {m.messageType}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                                            {m.content}
                                        </p>
                                        {m.createdAt && (
                                            <p className="text-[9px] text-neutral-700 mt-1">
                                                {new Date(m.createdAt).toLocaleTimeString()}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Event log tab */}
            {tab === "log" && (
                <div className="space-y-1.5">
                    {activity.length === 0 ? (
                        <EmptyState icon="📡" text="No events recorded" />
                    ) : (
                        activity.map((a, i) => (
                            <motion.div
                                key={a.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.015 }}
                                className="flex items-start gap-3 bg-neutral-900/30 border border-neutral-800/30 rounded-lg px-3 py-2"
                            >
                                <div className="w-6 h-6 shrink-0 rounded-lg bg-neutral-800/60 flex items-center justify-center text-[9px]">
                                    {agents[a.agentId]?.name?.[0] ?? "•"}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-medium text-neutral-400">
                                            {agents[a.agentId]?.name ?? a.agentId}
                                        </span>
                                        <span className="text-[9px] text-neutral-600">
                                            {a.action}
                                        </span>
                                        {a.createdAt && (
                                            <span className="ml-auto text-[8px] text-neutral-700 font-mono">
                                                {new Date(a.createdAt).toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                    {a.details && Object.keys(a.details).length > 0 && (
                                        <p className="text-[9px] text-neutral-600 font-mono mt-0.5 truncate">
                                            {JSON.stringify(a.details)}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
    return (
        <div className="h-[300px] flex items-center justify-center">
            <div className="text-center space-y-2">
                <span className="text-3xl animate-float inline-block">{icon}</span>
                <p className="text-neutral-500 text-sm">{text}</p>
            </div>
        </div>
    );
}
