"use client";

import { motion } from "framer-motion";
import type { Agent, AgentStatus } from "@/lib/types";
import { STATUS_THEME } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, Coffee, Laptop, LogOut, Users, LucideIcon } from "lucide-react";

interface Props {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
}

const DIM = { sm: 56, md: 80, lg: 100 } as const;

const STATUS_ICONS: Record<AgentStatus, LucideIcon> = {
  Idle: Coffee,
  Working: Laptop,
  Meeting: Users,
  Error: AlertTriangle,
  "Clocked Out": LogOut,
};

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
  const Icon = STATUS_ICONS[agent.status] || Activity;

  return (
    <motion.button
      layoutId={`avatar-${agent.id}`}
      onClick={onClick}
      aria-label={`Inspect ${agent.name}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: dimmed ? 0.4 : 1,
        scale: 1,
        border: selected ? `2px solid ${agent.avatarColor}` : `1px solid ${t.ring}`,
        backgroundColor: selected ? `${agent.avatarColor}15` : "transparent",
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      whileHover={{ scale: 1.05, y: -4, backgroundColor: `${agent.avatarColor}10` }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 cursor-pointer select-none group focus:outline-none transition-colors overflow-hidden rounded-xl",
        selected && "shadow-[0_0_20px_rgba(255,255,255,0.05)]"
      )}
      style={{
        width: d,
        height: d,
        background: `linear-gradient(135deg, ${agent.avatarColor}10, ${agent.avatarColor}05)`,
      }}
    >
      {/* Background Pulse Effect */}
      {pulses && (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-xl"
          style={{ backgroundColor: t.dot }}
        />
      )}

      {/* Initials */}
      <span
        className="font-heading font-bold leading-none pointer-events-none z-10"
        style={{
          color: agent.avatarColor,
          fontSize: size === "lg" ? 20 : size === "md" ? 16 : 12,
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
          className="text-[9px] font-bold leading-tight tracking-wider text-secondary uppercase pointer-events-none text-center px-1 z-10 opacity-70 group-hover:opacity-100 transition-opacity"
        >
          {agent.role}
        </span>
      )}

      {/* Status Icon */}
      <div className="absolute top-1 right-1 z-10 opacity-40 group-hover:opacity-100 transition-opacity">
        <Icon className="w-3 h-3" style={{ color: t.dot }} />
      </div>

      {/* Status Indicator (Bottom Bar) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 transition-all"
        style={{ backgroundColor: t.dot }}
      />

      {/* Hover tooltip */}
      <span className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 translate-y-2 group-hover:translate-y-0">
        <span className="bg-surface-2 border border-edge px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap text-foreground shadow-2xl font-bold uppercase tracking-widest">
          <strong style={{ color: agent.avatarColor }}>{agent.name}</strong> <span className="text-secondary mx-1">|</span> {agent.status}
        </span>
      </span>

      {/* Working task indicator */}
      {agent.currentTask && agent.status === "Working" && size !== "sm" && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full flex justify-center">
          <motion.span
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[7px] font-bold text-secondary uppercase tracking-tighter truncate max-w-[80px]"
          >
            {agent.currentTask}
          </motion.span>
        </div>
      )}
    </motion.button>
  );
}

/* ── Compact avatar for Kanban cards, etc. ── */
export function AgentDot({
  agent,
  size = 24,
}: {
  agent?: Agent;
  size?: number;
}) {
  if (!agent) return null;
  return (
    <div
      title={agent.name}
      className="rounded-lg font-heading font-bold flex items-center justify-center shrink-0 border border-edge/30 overflow-hidden"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `linear-gradient(135deg, ${agent.avatarColor}20, ${agent.avatarColor}10)`,
        color: agent.avatarColor,
      }}
    >
      {agent.name[0]}
    </div>
  );
}

/* ── Status badge ── */
export function StatusBadge({ status }: { status: AgentStatus }) {
  const Icon = STATUS_ICONS[status] || Activity;
  const cls: Record<AgentStatus, string> = {
    Idle: "bg-surface-3 text-secondary border-edge/50",
    Working: "bg-ok/10 text-ok border-ok/20",
    Meeting: "bg-warn/10 text-warn border-warn/20",
    Error: "bg-err/10 text-err border-err/20",
    "Clocked Out": "bg-surface-2 text-secondary/50 border-edge/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border transition-colors",
        cls[status]
      )}
    >
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}
