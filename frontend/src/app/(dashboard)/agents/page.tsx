"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/AgentAvatar";
import InspectorPanel from "@/components/InspectorPanel";
import type { Agent, AgentStatus, Message, Task } from "@/lib/types";
import { STATUS_THEME, ROOM_ICON } from "@/lib/types";

export default function AgentsPage() {
    const { agents, selectedId, select, tasksByAgent, messages } = useStore();
    const list = Object.values(agents);
    const [statusFilter, setStatusFilter] = useState<AgentStatus | "All">("All");

    const filtered = useMemo(
        () =>
            statusFilter === "All"
                ? list
                : list.filter((a) => a.status === statusFilter),
        [list, statusFilter],
    );

    const statuses: (AgentStatus | "All")[] = [
        "All",
        "Working",
        "Idle",
        "Meeting",
        "Error",
        "Clocked Out",
    ];

    return (
        <div className="h-full flex">
            {/* ── Directory ── */}
            <div className="flex-1 overflow-auto p-5 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-bold text-neutral-100 tracking-tight">
                            Swarm Directory
                        </h1>
                        <p className="text-xs text-neutral-500 mt-0.5">
                            Monitoring {list.length} agents · {list.filter((a) => a.status === "Working").length} currently active
                        </p>
                    </div>

                    {/* Status filter */}
                    <div className="flex gap-1.5 flex-wrap">
                        {statuses.map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all ${statusFilter === s
                                    ? "bg-violet-600/20 text-violet-300 border border-violet-700/40"
                                    : "bg-neutral-900/40 text-neutral-500 hover:text-neutral-300 border border-neutral-800/50 hover:border-neutral-700/50"
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Agent grid - Larger cards, 2 columns on large screens for more detail */}
                {list.length === 0 ? (
                    <div className="h-[400px] flex items-center justify-center">
                        <div className="text-center space-y-3">
                            <span className="text-4xl animate-bounce-slow inline-block">🤖</span>
                            <p className="text-neutral-400 text-sm font-medium">Assembling the swarm...</p>
                            <p className="text-neutral-600 text-xs">
                                Connecting to the neural engine via WebSocket
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filtered.map((agent, i) => (
                                <AgentDetailedCard
                                    key={agent.id}
                                    agent={agent}
                                    tasks={tasksByAgent(agent.id)}
                                    messages={messages.filter(m => m.fromAgent === agent.id || m.toAgent === agent.id).slice(0, 3)}
                                    isSelected={selectedId === agent.id}
                                    onSelect={() => select(agent.id)}
                                    index={i}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* ── Inspector sidebar ── */}
            {selectedId && (
                <aside className="hidden 2xl:block w-96 border-l border-neutral-800/50 bg-neutral-950/20 backdrop-blur-sm overflow-y-auto">
                    <InspectorPanel key={selectedId} />
                </aside>
            )}
        </div>
    );
}

function AgentDetailedCard({
    agent,
    tasks,
    messages,
    isSelected,
    onSelect,
    index
}: {
    agent: Agent;
    tasks: Task[];
    messages: Message[];
    isSelected: boolean;
    onSelect: () => void;
    index: number;
}) {
    return (
        <motion.button
            onClick={onSelect}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 260, damping: 20 }}
            className={`text-left bg-neutral-900/40 border rounded-3xl p-6 transition-all hover:bg-neutral-900/60 group relative overflow-hidden ${isSelected
                ? "border-violet-500/50 ring-1 ring-violet-500/20 bg-neutral-900/80 shadow-2xl shadow-violet-900/10"
                : "border-neutral-800/60 hover:border-neutral-700/80 shadow-sm"
                }`}
        >
            {/* Background Accent Glow */}
            <div
                className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10 transition-opacity group-hover:opacity-20"
                style={{ backgroundColor: agent.avatarColor }}
            />

            <div className="flex flex-col h-full space-y-5">
                {/* Header Section */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-xl shrink-0 transition-transform group-hover:scale-105"
                            style={{
                                background: `linear-gradient(135deg, ${agent.avatarColor}30, ${agent.avatarColor}10)`,
                                color: agent.avatarColor,
                                border: `2px solid ${agent.avatarColor}40`,
                            }}
                        >
                            {agent.name[0]}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-neutral-100 group-hover:text-white transition-colors">
                                {agent.name}
                            </h2>
                            <p className="text-xs text-neutral-500 font-medium">
                                {agent.role}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <StatusBadge status={agent.status} />
                                <span className="text-[11px] text-neutral-400 font-medium bg-neutral-800/50 px-2 py-0.5 rounded-lg border border-neutral-700/30">
                                    {ROOM_ICON[agent.room]} {agent.room}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-neutral-600 font-mono">ID: {agent.id}</span>
                        {agent.status === "Working" && (
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Current Activity & Thought Chain */}
                <div className="space-y-3">
                    {agent.currentTask && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-600">Current Focus</p>
                            <div className="bg-neutral-950/40 rounded-xl p-3 border border-neutral-800/50 group-hover:border-neutral-700/50 transition-colors">
                                <p className="text-xs text-neutral-300 leading-relaxed italic">
                                    "{agent.currentTask}"
                                </p>
                            </div>
                        </div>
                    )}

                    {agent.thoughtChain && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-600">Internal Reasoning</p>
                            <div className="bg-violet-950/10 rounded-xl p-3 border border-violet-900/20 group-hover:border-violet-800/30 transition-colors">
                                <p className="text-[11px] text-violet-300/70 font-mono line-clamp-3 leading-relaxed">
                                    {agent.thoughtChain}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Interactions & Tasks */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    {/* Communications Column */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-600">Recent Comms</p>
                        <div className="space-y-1.5">
                            {messages.length > 0 ? (
                                messages.map(m => {
                                    const isFrom = m.fromAgent === agent.id;
                                    const otherAgent = isFrom ? m.toAgent : m.fromAgent;
                                    return (
                                        <div key={m.id} className="text-[10px] flex items-center gap-2 text-neutral-500">
                                            <span className={isFrom ? "text-violet-400" : "text-emerald-400"}>
                                                {isFrom ? "→" : "←"}
                                            </span>
                                            <span className="font-semibold text-neutral-400 truncate max-w-[60px]">{otherAgent}</span>
                                            <span className="truncate flex-1 text-neutral-600 italic">
                                                {m.content.slice(0, 20)}...
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-[10px] text-neutral-700 italic">No recent messages</p>
                            )}
                        </div>
                    </div>

                    {/* Tasks Column */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-600">Active Load</p>
                        <div className="space-y-1.5">
                            {tasks.length > 0 ? (
                                tasks.slice(0, 3).map(t => (
                                    <div key={t.id} className="flex items-center gap-2">
                                        <div className={`w-1 h-1 rounded-full ${t.status === 'Done' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                                        <p className="text-[10px] text-neutral-400 truncate font-medium">{t.title}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-neutral-700 italic">Queue clear</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tech Stack / Tooling Footer */}
                {agent.techStack?.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5 border-t border-neutral-800/40 mt-auto">
                        {agent.techStack.slice(0, 5).map(tech => (
                            <span key={tech} className="px-2 py-0.5 bg-neutral-800/40 text-neutral-500 rounded-md text-[9px] font-medium border border-neutral-700/20">
                                {tech}
                            </span>
                        ))}
                        {agent.techStack.length > 5 && (
                            <span className="text-[9px] text-neutral-600 font-medium pl-1">
                                +{agent.techStack.length - 5} more
                            </span>
                        )}
                    </div>
                )}
            </div>
        </motion.button>
    );
}
