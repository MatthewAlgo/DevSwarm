"use client";

import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useStore } from "@/lib/store";
import { StatusBadge } from "./AgentAvatar";
import type { RoomType, Message, Agent } from "@/lib/types";
import { ROOM_ICON, STATUS_THEME } from "@/lib/types";

/* ── Room visual config ── */
const ROOMS: {
    room: RoomType;
    area: string;
    gradient: string;
    border: string;
}[] = [
        {
            room: "Private Office",
            area: "1 / 1 / 2 / 2",
            gradient: "from-violet-950/25 to-violet-900/5",
            border: "border-violet-800/20",
        },
        {
            room: "War Room",
            area: "1 / 2 / 2 / 3",
            gradient: "from-amber-950/25 to-amber-900/5",
            border: "border-amber-800/20",
        },
        {
            room: "Desks",
            area: "2 / 1 / 3 / 3",
            gradient: "from-sky-950/20 to-sky-900/5",
            border: "border-sky-800/15",
        },
        {
            room: "Lounge",
            area: "3 / 1 / 4 / 2",
            gradient: "from-emerald-950/25 to-emerald-900/5",
            border: "border-emerald-800/20",
        },
        {
            room: "Server Room",
            area: "3 / 2 / 4 / 3",
            gradient: "from-red-950/20 to-red-900/5",
            border: "border-red-800/15",
        },
    ];

export default function OfficeFloorPlan() {
    const { agents, selectedId, select, byRoom, messages } = useStore();
    const list = Object.values(agents);

    /* ── Loading state ── */
    if (list.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl animate-float">
                        🏢
                    </div>
                    <p className="text-neutral-500 text-sm">
                        Connecting to DevSwarm HQ…
                    </p>
                    <p className="text-neutral-700 text-[11px]">
                        Waiting for WebSocket state broadcast
                    </p>
                    <div className="w-40 h-1 mx-auto rounded-full overflow-hidden bg-neutral-800">
                        <div className="h-full w-1/2 rounded-full bg-violet-600 animate-shimmer" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <LayoutGroup>
            <div className="flex flex-col h-auto space-y-6">
                <div className="room-grid w-full">
                    {ROOMS.map(({ room, area, gradient, border }, ri) => {
                        const occupants = byRoom(room);
                        const hasWorking = occupants.some((a) => a.status === "Working");
                        const hasError = occupants.some((a) => a.status === "Error");

                        return (
                            <motion.div
                                key={room}
                                className={`relative rounded-3xl border ${border} bg-gradient-to-br ${gradient} p-5 overflow-hidden transition-shadow shadow-sm`}
                                style={{ gridArea: area }}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: ri * 0.08 }}
                            >
                                {/* Ambient grain overlay */}
                                <div className="absolute inset-0 pointer-events-none opacity-[.03]"
                                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.6' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='.5'/%3E%3C/svg%3E\")" }} />

                                {/* Room header */}
                                <div className="relative flex items-center gap-2.5 mb-4">
                                    <span className="text-lg">{ROOM_ICON[room]}</span>
                                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-[.15em]">
                                        {room}
                                    </span>
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-[10px] text-neutral-600 font-mono tabular-nums bg-neutral-900/50 px-2 py-0.5 rounded-md border border-neutral-800/50">
                                            {occupants.length}
                                        </span>

                                        {/* Status dots */}
                                        {(hasWorking || hasError) && (
                                            <div className="flex gap-1.5">
                                                {hasWorking && (
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                )}
                                                {hasError && (
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Agents */}
                                <div className="relative flex flex-wrap gap-4 items-start min-h-[60px]">
                                    <AnimatePresence mode="popLayout">
                                        {occupants.map((agent) => (
                                            <FloorAgentCard
                                                key={agent.id}
                                                agent={agent}
                                                selected={selectedId === agent.id}
                                                onClick={() => select(agent.id)}
                                            />
                                        ))}
                                    </AnimatePresence>

                                    {occupants.length === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="text-neutral-800 text-[10px] font-medium uppercase tracking-widest opacity-40">
                                                Empty
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Neural Activity Ticker ── */}
                <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-3xl p-5 overflow-hidden shadow-inner">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[.2em]">Neural Activity</h3>
                        </div>
                        <span className="text-[9px] text-neutral-600 font-mono">LIVE_SWARM_v2.0</span>
                    </div>

                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                        <AnimatePresence initial={false} mode="popLayout">
                            {messages.slice(0, 5).map((msg, i) => (
                                <MessageActivityRow key={msg.id} msg={msg} i={i} />
                            ))}
                        </AnimatePresence>
                        {messages.length === 0 && (
                            <div className="h-20 flex items-center justify-center opacity-30 italic text-[10px] text-neutral-500">
                                Waiting for neural pulses...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </LayoutGroup>
    );
}

function FloorAgentCard({
    agent,
    selected,
    onClick,
}: {
    agent: Agent;
    selected: boolean;
    onClick: () => void;
}) {
    const isWorking = agent.status === "Working";

    return (
        <motion.button
            layoutId={`agent-card-${agent.id}`}
            onClick={onClick}
            aria-label={`Inspect ${agent.name}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
                opacity: 1,
                scale: 1,
                border: selected ? `1px solid ${agent.avatarColor}80` : `1px solid rgba(38,38,38,0.4)`,
                boxShadow: isWorking ? `0 0 15px ${agent.avatarColor}20` : 'none'
            }}
            whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.03)" }}
            className={`flex flex-col text-left bg-neutral-900/60 rounded-xl p-3 w-44 transition-all ${selected ? 'ring-1 ring-violet-500/30 bg-neutral-900/80' : ''}`}
        >
            <div className="flex items-center gap-2 mb-2">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                        background: `linear-gradient(135deg, ${agent.avatarColor}25, ${agent.avatarColor}08)`,
                        color: agent.avatarColor,
                        border: `1px solid ${agent.avatarColor}30`,
                    }}
                >
                    {agent.name[0]}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold text-neutral-200 truncate">{agent.name}</p>
                    <p className="text-[8px] text-neutral-500 truncate leading-tight">{agent.role}</p>
                </div>
            </div>

            <div className="flex items-center justify-between gap-1 mt-auto">
                <StatusBadge status={agent.status} />
                {isWorking && (
                    <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                )}
            </div>

            {agent.currentTask && (
                <p className="text-[8px] text-neutral-400 line-clamp-1 mt-2 border-t border-neutral-800/50 pt-1.5 italic">
                    {agent.currentTask}
                </p>
            )}
        </motion.button>
    );
}

function MessageActivityRow({ msg, i }: { msg: Message; i: number }) {
    const isSystem = msg.fromAgent === 'system';
    const isUser = msg.toAgent === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="flex items-center gap-3 bg-neutral-950/30 border border-neutral-800/40 rounded-xl px-4 py-2.5 group hover:border-violet-900/30 transition-colors shadow-sm"
        >
            <div className="flex items-center gap-2 shrink-0 min-w-[140px]">
                <span className={`text-[10px] font-bold ${isSystem ? 'text-neutral-500' : 'text-violet-400'} uppercase tracking-tight`}>
                    {msg.fromAgent}
                </span>
                <span className="text-neutral-700 text-[10px]">→</span>
                <span className={`text-[10px] font-bold ${isUser ? 'text-emerald-400' : 'text-neutral-400'} uppercase tracking-tight`}>
                    {msg.toAgent}
                </span>
            </div>

            <div className="h-4 w-px bg-neutral-800/60" />

            <div className="flex-1 min-w-0">
                <p className="text-[11px] text-neutral-300 truncate font-medium group-hover:text-white transition-colors leading-relaxed">
                    {msg.content}
                </p>
            </div>

            <div className="shrink-0 flex items-center gap-2 ml-auto">
                <span className="text-[9px] font-mono text-neutral-600 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 whitespace-nowrap">
                    {msg.messageType}
                </span>
                <span className="text-[8px] text-neutral-700 tabular-nums whitespace-nowrap">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
            </div>
        </motion.div>
    );
}
