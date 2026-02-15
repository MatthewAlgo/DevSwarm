"use client";

import { motion } from "framer-motion";
import type { Agent, AgentStatus } from "@/lib/types";
import { STATUS_THEME } from "@/lib/types";

interface Props {
    agent: Agent;
    selected: boolean;
    onClick: () => void;
    size?: "sm" | "md" | "lg";
}

const DIM = { sm: 52, md: 72, lg: 88 } as const;

export default function AgentAvatar({
    agent,
    selected,
    onClick,
    size = "md",
}: Props) {
    const t = STATUS_THEME[agent.status] ?? STATUS_THEME.Idle;
    const d = DIM[size];
    const pulses = agent.status === "Working" || agent.status === "Error";
    const dimmed = agent.status === "Clocked Out";

    return (
        <motion.button
            layoutId={`avatar-${agent.id}`}
            onClick={onClick}
            aria-label={`Inspect ${agent.name}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
                opacity: dimmed ? 0.35 : 1,
                scale: 1,
                boxShadow: pulses
                    ? [t.glow, "none", t.glow]
                    : selected
                        ? `0 0 0 2px ${agent.avatarColor}`
                        : t.glow,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={
                pulses
                    ? {
                        boxShadow: {
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        },
                        layout: { type: "spring", stiffness: 220, damping: 24 },
                    }
                    : { type: "spring", stiffness: 220, damping: 24 }
            }
            whileHover={{ scale: 1.1, y: -3 }}
            whileTap={{ scale: 0.94 }}
            className="relative cursor-pointer select-none group focus:outline-none"
            style={{
                minWidth: d,
                minHeight: d,
                padding: size === "sm" ? 6 : 10,
                borderRadius: "20%",
                border: `2px solid ${t.ring}`,
                background: `linear-gradient(135deg, ${agent.avatarColor}18, ${agent.avatarColor}08)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
            }}
        >
            {/* Initials */}
            <span
                className="font-semibold leading-none pointer-events-none"
                style={{
                    color: agent.avatarColor,
                    fontSize: size === "lg" ? 18 : size === "md" ? 14 : 11,
                }}
            >
                {agent.name.length > 7
                    ? agent.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                    : agent.name}
            </span>

            {/* Role label (md+) */}
            {size !== "sm" && (
                <span
                    className="text-[8px] leading-tight tracking-wider text-neutral-500 uppercase pointer-events-none text-center px-1"
                >
                    {agent.role}
                </span>
            )}

            {/* Status dot */}
            <span
                className="absolute -bottom-[3px] -right-[3px] rounded-full ring-2 ring-[#050505]"
                style={{ width: 10, height: 10, background: t.dot }}
            />

            {/* Hover tooltip */}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <span className="glass px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap text-neutral-300 border border-neutral-800 shadow-xl">
                    <strong>{agent.name}</strong> · {agent.status}
                </span>
            </span>

            {/* Working task indicator */}
            {agent.currentTask && agent.status === "Working" && size !== "sm" && (
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[7px] text-neutral-600 max-w-[120px] text-center whitespace-nowrap overflow-hidden text-ellipsis"
                >
                    {agent.currentTask}
                </motion.span>
            )}
        </motion.button>
    );
}

/* ── Compact avatar for Kanban cards, etc. ── */
export function AgentDot({
    agent,
    size = 22,
}: {
    agent?: Agent;
    name?: string;
    color?: string;
    size?: number;
}) {
    if (!agent) return null;
    return (
        <div
            title={agent.name}
            className="rounded-lg font-bold flex items-center justify-center shrink-0"
            style={{
                width: size,
                height: size,
                fontSize: size * 0.42,
                background: agent.avatarColor + "30",
                color: agent.avatarColor,
                border: `1px solid ${agent.avatarColor}22`,
            }}
        >
            {agent.name[0]}
        </div>
    );
}

/* ── Status badge ── */
export function StatusBadge({ status }: { status: AgentStatus }) {
    const cls: Record<AgentStatus, string> = {
        Idle: "bg-neutral-800/60 text-neutral-400",
        Working: "bg-emerald-950/60 text-emerald-400",
        Meeting: "bg-amber-950/60 text-amber-400",
        Error: "bg-red-950/60 text-red-400",
        "Clocked Out": "bg-neutral-900/60 text-neutral-600",
    };
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${cls[status]}`}
        >
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: STATUS_THEME[status].dot }}
            />
            {status}
        </span>
    );
}
