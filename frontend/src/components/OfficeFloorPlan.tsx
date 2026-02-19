"use client";

import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useStore } from "@/lib/store";
import AgentAvatar from "./AgentAvatar";
import type { RoomType } from "@/lib/types";
import { ROOM_ICON } from "@/lib/types";

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
    const { agents, selectedId, select, byRoom } = useStore();
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
            <div className="room-grid h-full min-h-[520px]">
                {ROOMS.map(({ room, area, gradient, border }, ri) => {
                    const occupants = byRoom(room);
                    const hasWorking = occupants.some((a) => a.status === "Working");
                    const hasError = occupants.some((a) => a.status === "Error");

                    return (
                        <motion.div
                            key={room}
                            className={`relative rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-4 overflow-hidden transition-shadow`}
                            style={{ gridArea: area }}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: ri * 0.08 }}
                        >
                            {/* Ambient grain overlay */}
                            <div className="absolute inset-0 pointer-events-none opacity-[.03]"
                                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.6' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='.5'/%3E%3C/svg%3E\")" }} />

                            {/* Room header */}
                            <div className="relative flex items-center gap-2 mb-3">
                                <span className="text-sm">{ROOM_ICON[room]}</span>
                                <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[.1em]">
                                    {room}
                                </span>
                                <span className="ml-auto text-[9px] text-neutral-700 tabular-nums">
                                    {occupants.length}
                                </span>

                                {/* Status dots */}
                                <span className="flex gap-1 ml-1">
                                    {hasWorking && (
                                        <span className="w-[5px] h-[5px] rounded-full bg-emerald-500/70 animate-pulse" />
                                    )}
                                    {hasError && (
                                        <span className="w-[5px] h-[5px] rounded-full bg-red-500/70 animate-pulse" />
                                    )}
                                </span>
                            </div>

                            {/* Agents */}
                            <div className="relative flex flex-wrap gap-3 items-start min-h-[50px]">
                                <AnimatePresence mode="popLayout">
                                    {occupants.map((agent) => (
                                        <AgentAvatar
                                            key={agent.id}
                                            agent={agent}
                                            selected={selectedId === agent.id}
                                            onClick={() => select(agent.id)}
                                            size={room === "Desks" ? "md" : "sm"}
                                        />
                                    ))}
                                </AnimatePresence>

                                {occupants.length === 0 && (
                                    <span className="text-neutral-800 text-[10px] italic">
                                        Empty
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </LayoutGroup>
    );
}
