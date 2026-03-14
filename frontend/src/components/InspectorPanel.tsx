"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { StatusBadge } from "./AgentAvatar";
import { ROOM_ICON } from "@/lib/types";
import { cn } from "@/lib/utils";
import { X, Search, Terminal, Database, MessageSquare, ListChecks, MapPin, ArrowRight, ArrowLeft, Cpu } from "lucide-react";

export default function InspectorPanel() {
  const select = useStore((s) => s.select);
  const tasksByAgent = useStore((s) => s.tasksByAgent);
  const messages = useStore((s) => s.messages);
  const agent = useStore((s) =>
    s.selectedId ? s.agents[s.selectedId] ?? null : null,
  );

  if (!agent) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-2 border border-edge flex items-center justify-center">
            <Search className="w-6 h-6 text-secondary opacity-20" />
        </div>
        <div className="space-y-1">
            <p className="text-[10px] font-heading font-bold text-secondary uppercase tracking-[.2em]">
                Neural Inspector
            </p>
            <p className="text-[9px] text-secondary/50 uppercase tracking-widest">
                Select an active node to probe
            </p>
        </div>
      </div>
    );
  }

  const aTasks = tasksByAgent(agent.id);
  const aMessages = messages
    .filter((m) => m.fromAgent === agent.id || m.toAgent === agent.id)
    .slice(0, 15);

  return (
    <motion.div
      key={agent.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-full flex flex-col bg-surface overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="p-6 border-b border-edge/50 bg-surface-2/30">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-heading font-bold shadow-2xl relative overflow-hidden group"
              style={{
                background: `linear-gradient(135deg, ${agent.avatarColor}30, ${agent.avatarColor}10)`,
                color: agent.avatarColor,
                border: `1px solid ${agent.avatarColor}40`,
              }}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {agent.name[0]}
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-heading font-bold text-foreground tracking-wider uppercase">
                {agent.name}
              </h2>
              <p className="text-[10px] text-accent font-bold uppercase tracking-[.15em]">{agent.role}</p>
            </div>
          </div>
          <button
            onClick={() => select(null)}
            className="p-2 rounded-lg hover:bg-surface-3 text-secondary hover:text-foreground transition-all cursor-pointer border border-transparent hover:border-edge"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <StatusBadge status={agent.status} />
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-surface-3 border border-edge/50">
            <MapPin className="w-3 h-3 text-secondary" />
            <span className="text-[9px] font-bold text-foreground uppercase tracking-widest">
              {agent.room}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-12">
        {/* Current task */}
        {agent.currentTask && (
          <Section icon={Terminal} title="Current Process">
            <div className="rounded-xl bg-surface-2 border border-edge/60 p-4 shadow-inner">
              <p className="text-[11px] text-foreground/90 leading-relaxed font-medium">
                {agent.currentTask}
              </p>
            </div>
          </Section>
        )}

        {/* Thought chain */}
        {agent.thoughtChain && (
          <Section icon={Cpu} title="Neural Chain">
            <div className="rounded-xl bg-black/40 border border-edge p-4 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-2">
                <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
              </div>
              <p className="text-[10px] text-accent/80 font-mono leading-relaxed whitespace-pre-wrap selection:bg-accent/20">
                {agent.thoughtChain}
              </p>
            </div>
          </Section>
        )}

        {/* Tech stack */}
        {agent.techStack?.length > 0 && (
          <Section icon={Database} title="System Capabilities">
            <div className="flex flex-wrap gap-2">
              {agent.techStack.map((t) => (
                <div
                  key={t}
                  className="px-3 py-1.5 text-[9px] font-bold bg-surface-3 text-secondary rounded-lg border border-edge hover:border-accent/30 hover:text-foreground transition-all cursor-default"
                >
                  {t.toUpperCase()}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Tasks */}
        {aTasks.length > 0 && (
          <Section icon={ListChecks} title={`Process Queue (${aTasks.length})`}>
            <div className="space-y-2">
              {aTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl bg-surface-2/50 border border-edge/40 p-4 hover:border-accent/20 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[11px] text-foreground font-bold leading-tight group-hover:text-accent transition-colors">
                      {task.title}
                    </span>
                    <TaskStatusPill status={task.status} />
                  </div>
                  {task.description && (
                    <p className="text-[10px] text-secondary leading-relaxed line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Messages */}
        {aMessages.length > 0 && (
          <Section icon={MessageSquare} title="Recent Transmission">
            <div className="space-y-3">
              {aMessages.map((m) => {
                const outgoing = m.fromAgent === agent.id;
                return (
                  <div
                    key={m.id}
                    className={cn(
                        "p-4 rounded-xl border transition-all",
                        outgoing
                            ? "bg-accent/5 border-accent/20 ml-4"
                            : "bg-surface-3 border-edge mr-4"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {outgoing ? <ArrowRight className="w-3 h-3 text-accent" /> : <ArrowLeft className="w-3 h-3 text-secondary" />}
                        <span className="text-[9px] font-bold text-foreground uppercase tracking-widest">
                          {outgoing ? m.toAgent : m.fromAgent}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono font-bold text-secondary/50 uppercase">
                        {m.messageType}
                      </span>
                    </div>
                    <p className="text-[10px] text-foreground/80 leading-relaxed italic">
                      "{m.content}"
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    </motion.div>
  );
}

/* ── Helpers ── */

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Icon className="w-3.5 h-3.5 text-accent" />
        <h3 className="text-[10px] font-heading font-bold text-secondary uppercase tracking-[.2em]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function TaskStatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    Done: "bg-ok/10 text-ok border-ok/20",
    "In Progress": "bg-accent/10 text-accent border-accent/20",
    Review: "bg-warn/10 text-warn border-warn/20",
    Blocked: "bg-err/10 text-err border-err/20",
    Backlog: "bg-surface-3 text-secondary border-edge/50",
  };
  return (
    <span
      className={cn(
        "shrink-0 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors",
        cls[status] ?? cls.Backlog
      )}
    >
      {status}
    </span>
  );
}
