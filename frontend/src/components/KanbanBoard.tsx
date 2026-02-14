"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AgentDot } from "./AgentAvatar";
import type { TaskStatus } from "@/lib/types";

const COLS: { id: TaskStatus; label: string; accent: string }[] = [
    { id: "Backlog", label: "Backlog", accent: "border-neutral-600" },
    { id: "In Progress", label: "In Progress", accent: "border-sky-600" },
    { id: "Review", label: "Review", accent: "border-amber-600" },
    { id: "Done", label: "Done", accent: "border-emerald-600" },
];

export default function KanbanBoard() {
    const { tasks, agents, tasksByStatus } = useStore();

    if (tasks.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                    <span className="text-3xl animate-float inline-block">📋</span>
                    <p className="text-neutral-500 text-sm">No tasks yet</p>
                    <p className="text-neutral-700 text-[11px]">
                        Tasks appear when agents start working
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">
                    Task Board
                </h2>
                <span className="text-[10px] text-neutral-700 tabular-nums">
                    {tasks.length} tasks
                </span>
            </div>

            {/* Columns */}
            <div className="kanban-grid">
                {COLS.map((col) => {
                    const items = tasksByStatus(col.id);

                    return (
                        <div key={col.id} className="space-y-2.5">
                            {/* Column header */}
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

                            {/* Cards */}
                            <div className="space-y-2 min-h-[120px]">
                                {items.map((task, i) => (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="group bg-neutral-900/70 border border-neutral-800/50 rounded-xl p-3 hover:border-neutral-700/60 hover:bg-neutral-900 transition-all cursor-default"
                                    >
                                        <h3 className="text-[11px] font-medium text-neutral-300 leading-snug mb-1 line-clamp-2">
                                            {task.title}
                                        </h3>
                                        {task.description && (
                                            <p className="text-[9px] text-neutral-600 line-clamp-2 mb-2">
                                                {task.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between mt-auto">
                                            {/* Assigned agents */}
                                            <div className="flex -space-x-1.5">
                                                {task.assignedAgents?.slice(0, 3).map((aid) => (
                                                    <AgentDot key={aid} agent={agents[aid]} size={20} />
                                                ))}
                                            </div>

                                            {/* Priority */}
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
        </div>
    );
}
