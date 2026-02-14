"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AgentDot } from "@/components/AgentAvatar";
import type { TaskStatus } from "@/lib/types";

const COLS: { id: TaskStatus; label: string; accent: string }[] = [
    { id: "Backlog", label: "Backlog", accent: "border-neutral-600" },
    { id: "In Progress", label: "In Progress", accent: "border-sky-600" },
    { id: "Review", label: "Review", accent: "border-amber-600" },
    { id: "Done", label: "Done", accent: "border-emerald-600" },
];

export default function KanbanPage() {
    const { tasks, agents, tasksByStatus } = useStore();
    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<number | null>(null);

    const filtered = useMemo(() => {
        return tasks.filter((t) => {
            if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
            if (priorityFilter !== null && t.priority !== priorityFilter) return false;
            return true;
        });
    }, [tasks, search, priorityFilter]);

    const filteredByStatus = (s: TaskStatus) =>
        filtered.filter((t) => t.status === s);

    return (
        <div className="p-5 lg:p-8 space-y-5">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-sm font-bold text-neutral-200 tracking-wider uppercase">
                        Task Board
                    </h1>
                    <p className="text-[11px] text-neutral-600 mt-0.5">
                        {tasks.length} tasks across all agents
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search */}
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search tasks…"
                        className="bg-neutral-900/80 border border-neutral-800/50 rounded-lg px-3 py-1.5 text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-violet-700/40 w-48"
                    />

                    {/* Priority filter */}
                    <div className="flex gap-1">
                        {[null, 1, 2, 3, 4, 5].map((p) => (
                            <button
                                key={String(p)}
                                onClick={() => setPriorityFilter(p)}
                                className={`px-2 py-1 text-[9px] rounded-md font-medium transition-all ${priorityFilter === p
                                        ? "bg-violet-600/20 text-violet-300 border border-violet-700/40"
                                        : "text-neutral-600 hover:text-neutral-400"
                                    }`}
                            >
                                {p === null ? "All" : `P${p}`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Board ── */}
            {tasks.length === 0 ? (
                <div className="h-[400px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <span className="text-3xl animate-float inline-block">📋</span>
                        <p className="text-neutral-500 text-sm">No tasks yet</p>
                        <p className="text-neutral-700 text-[11px]">
                            Tasks appear when agents start working
                        </p>
                    </div>
                </div>
            ) : (
                <div className="kanban-grid">
                    {COLS.map((col) => {
                        const items = filteredByStatus(col.id);
                        return (
                            <div key={col.id} className="space-y-2.5">
                                <div
                                    className={`flex items-center justify-between pb-2 border-b-2 ${col.accent}`}
                                >
                                    <span className="text-[11px] font-semibold text-neutral-400">
                                        {col.label}
                                    </span>
                                    <span className="text-[10px] text-neutral-700 bg-neutral-900 px-1.5 py-0.5 rounded-full tabular-nums">
                                        {items.length}
                                    </span>
                                </div>

                                <div className="space-y-2 min-h-[200px]">
                                    {items.map((task, i) => (
                                        <motion.div
                                            key={task.id}
                                            layout
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="bg-neutral-900/70 border border-neutral-800/50 rounded-xl p-3 hover:border-neutral-700/60 hover:bg-neutral-900 transition-all"
                                        >
                                            <h3 className="text-[11px] font-medium text-neutral-300 leading-snug mb-1 line-clamp-2">
                                                {task.title}
                                            </h3>
                                            {task.description && (
                                                <p className="text-[9px] text-neutral-600 line-clamp-2 mb-2">
                                                    {task.description}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <div className="flex -space-x-1.5">
                                                    {task.assignedAgents?.slice(0, 3).map((aid) => (
                                                        <AgentDot key={aid} agent={agents[aid]} size={18} />
                                                    ))}
                                                </div>
                                                {task.priority > 0 && (
                                                    <span
                                                        className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md ${task.priority >= 4
                                                                ? "bg-red-950/50 text-red-400"
                                                                : task.priority >= 2
                                                                    ? "bg-amber-950/50 text-amber-400"
                                                                    : "bg-neutral-800/60 text-neutral-500"
                                                            }`}
                                                    >
                                                        P{task.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
