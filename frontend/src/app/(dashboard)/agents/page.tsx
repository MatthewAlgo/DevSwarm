"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/AgentAvatar";
import InspectorPanel from "@/components/InspectorPanel";
import type { AgentStatus, RoomType } from "@/lib/types";
import { STATUS_THEME, ROOM_ICON } from "@/lib/types";

export default function AgentsPage() {
    const { agents, selectedId, select, tasksByAgent } = useStore();
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
            <div className="flex-1 overflow-auto p-5 lg:p-8 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-sm font-bold text-neutral-200 tracking-wider uppercase">
                            Agent Directory
                        </h1>
                        <p className="text-[11px] text-neutral-600 mt-0.5">
                            {list.length} agents · {list.filter((a) => a.status === "Working").length} active
                        </p>
                    </div>

                    {/* Status filter */}
                    <div className="flex gap-1 flex-wrap">
                        {statuses.map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-2.5 py-1 text-[10px] rounded-lg font-medium transition-all ${statusFilter === s
                                        ? "bg-violet-600/20 text-violet-300 border border-violet-700/40"
                                        : "text-neutral-600 hover:text-neutral-400 border border-transparent"
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Agent grid */}
                {list.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <span className="text-3xl animate-float inline-block">🤖</span>
                            <p className="text-neutral-500 text-sm">No agents loaded</p>
                            <p className="text-neutral-700 text-[11px]">
                                Waiting for WebSocket data
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filtered.map((agent, i) => {
                            const aTasks = tasksByAgent(agent.id);
                            const isSelected = selectedId === agent.id;

                            return (
                                <motion.button
                                    key={agent.id}
                                    onClick={() => select(isSelected ? null : agent.id)}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className={`text-left bg-neutral-900/60 border rounded-2xl p-4 transition-all hover:bg-neutral-900 ${isSelected
                                            ? "border-violet-600/40 ring-1 ring-violet-600/20"
                                            : "border-neutral-800/40 hover:border-neutral-700/60"
                                        }`}
                                >
                                    {/* Top row */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0"
                                            style={{
                                                background: `linear-gradient(135deg, ${agent.avatarColor}25, ${agent.avatarColor}08)`,
                                                color: agent.avatarColor,
                                                border: `2px solid ${agent.avatarColor}30`,
                                            }}
                                        >
                                            {agent.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-neutral-200 truncate">
                                                {agent.name}
                                            </p>
                                            <p className="text-[10px] text-neutral-600 truncate">
                                                {agent.role}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Status + Room */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <StatusBadge status={agent.status} />
                                        <span className="text-[10px] text-neutral-700">
                                            {ROOM_ICON[agent.room]} {agent.room}
                                        </span>
                                    </div>

                                    {/* Current task */}
                                    {agent.currentTask && (
                                        <p className="text-[10px] text-neutral-500 line-clamp-1 mb-2">
                                            ↳ {agent.currentTask}
                                        </p>
                                    )}

                                    {/* Stats row */}
                                    <div className="flex items-center gap-3 text-[9px] text-neutral-700">
                                        <span>{aTasks.length} tasks</span>
                                        {agent.techStack?.length > 0 && (
                                            <span>{agent.techStack.length} tools</span>
                                        )}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Inspector sidebar ── */}
            {selectedId && (
                <aside className="hidden lg:block w-80 xl:w-[22rem] border-l border-neutral-800/50 overflow-y-auto">
                    <InspectorPanel />
                </aside>
            )}
        </div>
    );
}
