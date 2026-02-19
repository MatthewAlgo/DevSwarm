"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { StatusBadge } from "./AgentAvatar";
import type { AgentStatus } from "@/lib/types";
import { ROOM_ICON, STATUS_THEME } from "@/lib/types";

export default function InspectorPanel() {
    const select = useStore((s) => s.select);
    const tasksByAgent = useStore((s) => s.tasksByAgent);
    const messages = useStore((s) => s.messages);
    const agent = useStore((s) =>
        s.selectedId ? s.agents[s.selectedId] ?? null : null,
    );

    if (!agent) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="text-center space-y-2">
                    <span className="text-2xl">🔍</span>
                    <p className="text-neutral-600 text-xs">
                        Select an agent to inspect
                    </p>
                </div>
            </div>
        );
    }

    const aTasks = tasksByAgent(agent.id);
    const aMessages = messages
        .filter((m) => m.fromAgent === agent.id || m.toAgent === agent.id)
        .slice(0, 12);

    return (
        <motion.div
            key={agent.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="p-5 space-y-5 select-text"
        >
            {/* ── Agent header ── */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg"
                        style={{
                            background: `linear-gradient(135deg, ${agent.avatarColor}25, ${agent.avatarColor}0a)`,
                            color: agent.avatarColor,
                            border: `2px solid ${agent.avatarColor}30`,
                            boxShadow: `0 8px 24px ${agent.avatarColor}15`,
                        }}
                    >
                        {agent.name[0]}
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-neutral-100">
                            {agent.name}
                        </h2>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{agent.role}</p>
                    </div>
                </div>
                <button
                    onClick={() => select(null)}
                    className="text-neutral-600 hover:text-neutral-300 text-xl transition-colors p-1"
                >
                    ×
                </button>
            </div>

            {/* ── Status + Room ── */}
            <div className="flex items-center gap-2.5">
                <StatusBadge status={agent.status} />
                <span className="text-[11px] text-neutral-600">
                    {ROOM_ICON[agent.room]} {agent.room}
                </span>
            </div>

            {/* ── Current task ── */}
            {agent.currentTask && (
                <Section title="Current Task">
                    <div className="rounded-xl bg-neutral-900/80 border border-neutral-800/60 p-3">
                        <p className="text-xs text-neutral-300 leading-relaxed">
                            {agent.currentTask}
                        </p>
                    </div>
                </Section>
            )}

            {/* ── Thought chain ── */}
            {agent.thoughtChain && (
                <Section title="Thought Chain">
                    <div className="rounded-xl bg-neutral-950/60 border border-neutral-800/40 p-3">
                        <p className="text-[11px] text-violet-300/80 font-mono leading-relaxed whitespace-pre-wrap">
                            {agent.thoughtChain}
                        </p>
                    </div>
                </Section>
            )}

            {/* ── Tech stack ── */}
            {agent.techStack?.length > 0 && (
                <Section title="Tech Stack">
                    <div className="flex flex-wrap gap-1.5">
                        {agent.techStack.map((t) => (
                            <span
                                key={t}
                                className="px-2 py-[3px] text-[9px] font-medium bg-neutral-800/60 text-neutral-400 rounded-md border border-neutral-700/40"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── Tasks ── */}
            {aTasks.length > 0 && (
                <Section title={`Tasks (${aTasks.length})`}>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {aTasks.map((task) => (
                            <div
                                key={task.id}
                                className="rounded-lg bg-neutral-900/60 border border-neutral-800/40 px-3 py-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[11px] text-neutral-300 font-medium leading-tight line-clamp-1">
                                        {task.title}
                                    </span>
                                    <TaskStatusPill status={task.status} />
                                </div>
                                {task.description && (
                                    <p className="text-[10px] text-neutral-600 mt-1 line-clamp-1">
                                        {task.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── Messages ── */}
            {aMessages.length > 0 && (
                <Section title="Messages">
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                        {aMessages.map((m) => {
                            const outgoing = m.fromAgent === agent.id;
                            return (
                                <div
                                    key={m.id}
                                    className={`text-[10px] p-2.5 rounded-xl ${outgoing
                                            ? "bg-violet-950/30 border border-violet-800/20 ml-5"
                                            : "bg-neutral-900/60 border border-neutral-800/40 mr-5"
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1 text-neutral-600">
                                        <span>
                                            {outgoing ? `→ ${m.toAgent}` : `← ${m.fromAgent}`}
                                        </span>
                                        <span className="text-[8px] text-neutral-700">
                                            {m.messageType}
                                        </span>
                                    </div>
                                    <p className="text-neutral-400 leading-relaxed">
                                        {m.content}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}
        </motion.div>
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
            <h3 className="text-[9px] font-semibold text-neutral-600 uppercase tracking-[.12em] mb-2">
                {title}
            </h3>
            {children}
        </div>
    );
}

function TaskStatusPill({ status }: { status: string }) {
    const cls: Record<string, string> = {
        Done: "bg-emerald-950/50 text-emerald-400",
        "In Progress": "bg-sky-950/50 text-sky-400",
        Review: "bg-amber-950/50 text-amber-400",
        Blocked: "bg-red-950/50 text-red-400",
        Backlog: "bg-neutral-800/50 text-neutral-500",
    };
    return (
        <span
            className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-medium ${cls[status] ?? cls.Backlog}`}
        >
            {status}
        </span>
    );
}
