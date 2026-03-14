"use client";

import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useStore } from "@/lib/store";
import { StatusBadge } from "./AgentAvatar";
import type { RoomType, Message, Agent } from "@/lib/types";
import { ROOM_ICON } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Users, ShieldAlert, Briefcase, Coffee, Server, Activity, ArrowRight } from "lucide-react";

/* ── Room visual config ── */
const ROOM_CONFIG: Record<RoomType, { icon: any; color: string }> = {
  "Private Office": { icon: ShieldAlert, color: "text-violet-500" },
  "War Room": { icon: Users, color: "text-amber-500" },
  "Desks": { icon: Briefcase, color: "text-sky-500" },
  "Lounge": { icon: Coffee, color: "text-emerald-500" },
  "Server Room": { icon: Server, color: "text-red-500" },
};

const ROOMS: {
  room: RoomType;
  area: string;
}[] = [
  { room: "Private Office", area: "1 / 1 / 2 / 2" },
  { room: "War Room", area: "1 / 2 / 2 / 3" },
  { room: "Desks", area: "2 / 1 / 3 / 3" },
  { room: "Lounge", area: "3 / 1 / 4 / 2" },
  { room: "Server Room", area: "3 / 2 / 4 / 3" },
];

export default function OfficeFloorPlan() {
  const { agents, selectedId, select, byRoom, messages } = useStore();
  const list = Object.values(agents);

  /* ── Loading state ── */
  if (list.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-accent/20 rounded-2xl animate-ping" />
            <div className="relative w-16 h-16 rounded-2xl bg-surface-2 border border-edge flex items-center justify-center shadow-2xl animate-bounce-slow">
              <Activity className="w-8 h-8 text-accent" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-heading font-bold text-foreground uppercase tracking-widest">
              Establishing Neural Link
            </h2>
            <p className="text-secondary text-[10px] uppercase tracking-tighter">
              Waiting for swarm broadcast...
            </p>
          </div>
          <div className="w-48 h-1.5 mx-auto rounded-full overflow-hidden bg-surface-3 border border-edge/50 p-[1px]">
            <div className="h-full w-1/3 rounded-full bg-accent animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <LayoutGroup>
      <div className="flex flex-col h-auto space-y-8">
        <div className="room-grid w-full gap-4">
          {ROOMS.map(({ room, area }, ri) => {
            const occupants = byRoom(room);
            const hasWorking = occupants.some((a) => a.status === "Working");
            const hasError = occupants.some((a) => a.status === "Error");
            const config = ROOM_CONFIG[room];
            const RoomIcon = config.icon;

            return (
              <motion.div
                key={room}
                className="relative rounded-2xl border border-edge bg-surface-2/40 backdrop-blur-sm p-6 overflow-hidden group hover:border-accent/30 transition-colors"
                style={{ gridArea: area }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ri * 0.05 }}
              >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-2 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                    <RoomIcon className="w-24 h-24" />
                </div>

                {/* Room header */}
                <div className="relative flex items-center gap-3 mb-6">
                  <div className={cn("p-2 rounded-lg bg-surface-3 border border-edge/50", config.color)}>
                    <RoomIcon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-heading font-bold text-foreground uppercase tracking-[.2em]">
                        {room}
                    </span>
                    <span className="text-[8px] text-secondary font-bold uppercase tracking-tighter">
                        Zone Sector {ri + 1}
                    </span>
                  </div>
                  
                  <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-surface-3/80 px-2 py-1 rounded-md border border-edge/50">
                        <Users className="w-3 h-3 text-secondary" />
                        <span className="text-[10px] text-foreground font-mono font-bold tabular-nums">
                            {occupants.length}
                        </span>
                    </div>

                    {/* Status dots */}
                    {(hasWorking || hasError) && (
                      <div className="flex gap-2">
                        {hasWorking && (
                          <div className="w-2 h-2 rounded-full bg-ok animate-status-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                        )}
                        {hasError && (
                          <div className="w-2 h-2 rounded-full bg-err animate-status-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Agents */}
                <div className="relative flex flex-wrap gap-4 items-start min-h-[80px]">
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
                      <span className="text-secondary/20 text-[9px] font-heading font-bold uppercase tracking-[.3em]">
                        Empty Sector
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Neural Activity Ticker ── */}
        <div className="bg-surface-2 border border-edge rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          {/* Subtle background scanline */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-10" />
          
          <div className="flex items-center justify-between mb-6 px-1 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent animate-status-pulse shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
              <h3 className="text-[10px] font-heading font-bold text-foreground uppercase tracking-[.25em]">Neural Pulse Stream</h3>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-[9px] text-accent font-mono font-bold tracking-tighter animate-pulse">REC // LIVE_LINK</span>
                <span className="text-[9px] text-secondary font-mono border-l border-edge pl-4">BUILD_VER_2.4.0</span>
            </div>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-3 relative z-10">
            <AnimatePresence initial={false} mode="popLayout">
              {messages.slice(0, 6).map((msg, i) => (
                <MessageActivityRow key={msg.id} msg={msg} i={i} />
              ))}
            </AnimatePresence>
            {messages.length === 0 && (
              <div className="h-24 flex flex-col items-center justify-center opacity-20 space-y-2">
                <Activity className="w-6 h-6 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Awaiting Neural Pulses...</span>
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        border: selected ? `1px solid ${agent.avatarColor}` : `1px solid var(--color-edge)`,
        backgroundColor: selected ? `${agent.avatarColor}10` : "var(--color-surface-3)",
        boxShadow: selected ? `0 0 20px ${agent.avatarColor}15` : 'none'
      }}
      whileHover={{ y: -4, backgroundColor: "var(--color-surface-3)", borderColor: agent.avatarColor + "50" }}
      className={cn(
        "flex flex-col text-left rounded-xl p-4 w-48 transition-all cursor-pointer relative overflow-hidden group",
        selected && "z-20"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-heading font-bold shrink-0 shadow-inner"
          style={{
            background: `linear-gradient(135deg, ${agent.avatarColor}25, ${agent.avatarColor}05)`,
            color: agent.avatarColor,
            border: `1px solid ${agent.avatarColor}30`,
          }}
        >
          {agent.name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-foreground truncate uppercase tracking-tight">{agent.name}</p>
          <p className="text-[9px] text-secondary truncate font-bold uppercase opacity-60">{agent.role}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto">
        <StatusBadge status={agent.status} />
        {isWorking && (
          <div className="flex gap-1">
            <span className="w-1 h-1 rounded-full bg-ok animate-ping" />
            <span className="w-1 h-1 rounded-full bg-ok" />
          </div>
        )}
      </div>

      {agent.currentTask && (
        <div className="mt-3 pt-3 border-t border-edge/30">
            <p className="text-[8px] text-secondary font-bold uppercase tracking-tighter line-clamp-1 opacity-80 group-hover:opacity-100 transition-opacity">
                {agent.currentTask}
            </p>
        </div>
      )}
    </motion.button>
  );
}

function MessageActivityRow({ msg, i }: { msg: Message; i: number }) {
  const isSystem = msg.fromAgent === 'system';
  const isUser = msg.toAgent === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.4, delay: i * 0.04 }}
      className="flex items-center gap-4 bg-surface-3/50 border border-edge/40 rounded-xl px-5 py-3 group hover:border-accent/30 hover:bg-surface-3/80 transition-all shadow-sm"
    >
      <div className="flex items-center gap-3 shrink-0 min-w-[160px]">
        <div className={cn(
            "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border",
            isSystem ? "text-secondary border-edge/50 bg-edge/20" : "text-accent border-accent/20 bg-accent/5"
        )}>
          {msg.fromAgent}
        </div>
        <ArrowRight className="w-3 h-3 text-edge" />
        <div className={cn(
            "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border",
            isUser ? "text-ok border-ok/20 bg-ok/5" : "text-secondary border-edge/50 bg-edge/20"
        )}>
          {msg.toAgent}
        </div>
      </div>

      <div className="h-6 w-px bg-edge/30" />

      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-foreground/80 truncate font-medium group-hover:text-foreground transition-colors">
          {msg.content}
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-3 ml-auto">
        <div className="text-[8px] font-mono font-bold text-secondary bg-surface-2 px-2 py-1 rounded border border-edge/50 uppercase tracking-tighter">
          {msg.messageType}
        </div>
        <div className="text-[9px] font-mono text-secondary/50 tabular-nums">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>
      </div>
    </motion.div>
  );
}
