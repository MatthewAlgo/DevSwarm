"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { AgentDot, StatusBadge } from "./AgentAvatar";
import KanbanBoard from "./KanbanBoard";
import { cn } from "@/lib/utils";
import {
  Zap, Shield, X, LayoutGrid, Kanban, DollarSign, Activity,
  Terminal, Play, Clock, Coffee, Users, RotateCw, CheckCircle2,
  ChevronRight, Cpu, Globe, Rocket, LogOut, LucideIcon, Search, Database, MessageSquare, ListChecks, MapPin, ArrowLeft, ArrowRight
} from "lucide-react";

export default function GodMode() {
  const { agents, toggleGod, messages, tasks, connected, costs, version } = useStore();
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [tab, setTab] = useState<"overview" | "kanban" | "costs">("overview");

  const list = Object.values(agents);

  const push = useCallback(
    (m: string) =>
      setLog((p) =>
        [`[${new Date().toLocaleTimeString()}] ${m}`, ...p].slice(0, 100),
      ),
    [],
  );

  /* ── handlers ── */

  const trigger = async () => {
    if (!goal.trim()) return;
    setBusy(true);
    push(`▶ INJECTING_GOAL: "${goal}"`);
    try {
      await api.triggerGoal(goal);
      push("✅ GOAL_STAGED_SUCCESSFULLY");
      setGoal("");
    } catch (e) {
      push(`❌ ERROR_STAGING_GOAL: ${e}`);
    }
    setBusy(false);
  };

  const override = async (status: string, room: string) => {
    push(`⚡ OVERRIDE_STATE → ${status} // ${room}`);
    try {
      await api.overrideState({
        global_status: status,
        default_room: room,
        message: `GOD_OVERRIDE: ${status}`,
      });
      push(`✅ STATE_SYNCHRONIZED`);
    } catch (e) {
      push(`❌ SYNC_FAILURE: ${e}`);
    }
  };

  const demo = async () => {
    push("▶ INITIALIZING_DEMO_SEQUENCE…");
    try {
      await api.simulateDemoDay();
      push("✅ DEMO_SEQUENCE_ACTIVE");
    } catch (e) {
      push(`❌ SEQUENCE_ABORTED: ${e}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 overflow-auto font-sans selection:bg-accent/30"
    >
      {/* ── Header ── */}
      <div className="h-16 sticky top-0 border-b border-accent/20 flex items-center justify-between px-8 bg-background/90 backdrop-blur-2xl z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-heading font-bold text-foreground tracking-[.3em] uppercase">
              God_Mode
            </h1>
            <span className="text-[8px] text-accent font-bold uppercase tracking-widest animate-pulse">Root_Access_Granted</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface-3 border border-edge/50 rounded-xl p-1">
          {[
            { id: "overview", label: "Overview", icon: LayoutGrid },
            { id: "kanban", label: "Directives", icon: Kanban },
            { id: "costs", label: "Resource_Usage", icon: DollarSign },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as "overview" | "kanban" | "costs")}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all cursor-pointer",
                  active
                    ? "bg-accent text-white shadow-lg"
                    : "text-secondary hover:text-foreground hover:bg-surface-2"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={toggleGod}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-surface-2 border border-edge text-secondary hover:text-err hover:border-err/50 transition-all cursor-pointer group"
        >
          <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span>Exit_Interface</span>
        </button>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 lg:p-10 relative">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* ── Overview Tab ── */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
            {/* Main area */}
            <div className="space-y-10 relative z-10">
              {/* Stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total_Nodes" value={list.length} icon={Cpu} color="text-accent" />
                <StatCard label="Active_Processes" value={list.filter((a) => a.status === "Working").length} icon={Activity} color="text-ok" />
                <StatCard label="Queued_Directives" value={tasks.length} icon={Rocket} color="text-warn" />
                <StatCard label="Neural_Transmissions" value={messages.length} icon={Globe} color="text-primary" />
              </div>

              {/* Agent grid */}
              <Section icon={Users} title="Swarm_Node_States">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {list.map((a) => (
                    <motion.div
                      key={a.id}
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="bg-surface-2 border border-edge/60 rounded-2xl p-5 space-y-4 hover:border-accent/40 transition-all shadow-sm hover:shadow-xl group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <AgentDot agent={a} size={36} />
                          <div className="min-w-0">
                            <p className="text-xs font-heading font-bold text-foreground truncate uppercase">
                              {a.name}
                            </p>
                            <p className="text-[9px] text-secondary font-bold uppercase tracking-tighter opacity-60">
                              {a.role}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[9px] text-secondary font-bold uppercase tracking-widest bg-surface-3 px-2 py-1 rounded border border-edge/50">
                          <ChevronRight className="w-3 h-3 text-accent" />
                          <span>Loc: {a.room}</span>
                        </div>
                        {a.currentTask && (
                          <div className="bg-black/20 rounded-lg p-3 border border-edge/30">
                            <p className="text-[9px] text-foreground/80 leading-relaxed font-medium italic line-clamp-2">
                              &quot;{a.currentTask}&quot;
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Section>

              {/* Command console */}
              <Section icon={Terminal} title="Root_Command_Interface">
                <div className="bg-surface-2 border border-edge rounded-2xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Terminal className="w-32 h-32" />
                  </div>

                  <div className="space-y-4 relative z-10">
                    <h4 className="text-[10px] font-heading font-bold text-secondary uppercase tracking-[.25em]">Inject_Directive</h4>
                    <div className="flex gap-3">
                      <div className="flex-1 relative group">
                        <div className="absolute -inset-[1px] bg-gradient-to-r from-accent/50 to-violet-500/50 rounded-xl blur-sm opacity-0 group-focus-within:opacity-20 transition-opacity" />
                        <input
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && trigger()}
                          placeholder="Awaiting swarm instructions…"
                          className="w-full bg-surface-3 border border-edge rounded-xl px-6 py-4 text-xs text-foreground placeholder:text-secondary/30 focus:outline-none focus:border-accent/50 transition-all font-medium"
                        />
                      </div>
                      <button
                        onClick={trigger}
                        disabled={busy || !goal.trim()}
                        className="px-8 py-4 bg-accent text-white text-[10px] font-heading font-bold uppercase tracking-widest rounded-xl hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-accent/20 cursor-pointer active:scale-95"
                      >
                        {busy ? <RotateCw className="w-4 h-4 animate-spin" /> : "EXECUTE"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <h4 className="text-[10px] font-heading font-bold text-secondary uppercase tracking-[.25em]">Quick_System_Overrides</h4>
                    <div className="flex flex-wrap gap-3">
                      <QuickAction icon={Play} label="DEMO_PROTOCOL" color="text-accent" onClick={demo} />
                      <QuickAction icon={Clock} label="CLOCK_IN_ALL" color="text-ok" onClick={() => override("Idle", "Desks")} />
                      <QuickAction icon={LogOut} label="TERMINATE_SHIFT" color="text-warn" onClick={() => override("Clocked Out", "Lounge")} />
                      <QuickAction icon={Users} label="SUMMON_WAR_ROOM" color="text-accent" onClick={() => override("Meeting", "War Room")} />
                      <QuickAction icon={RotateCw} label="FORCE_SIMULATION" color="text-secondary" onClick={async () => {
                        push("▶ FORCING_ACTIVITY_SIMULATION…");
                        try {
                          await api.simulateActivity();
                          push("✅ SIMULATION_COMPLETE");
                        } catch (e) {
                          push(`❌ SIMULATION_ERROR: ${e}`);
                        }
                      }} />
                    </div>
                  </div>
                </div>
              </Section>
            </div>

            {/* Sidebar */}
            <div className="space-y-10 relative z-10">
              {/* Connection Status */}
              <div className="p-6 bg-surface-2 rounded-2xl border border-edge shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-heading font-bold text-secondary uppercase tracking-widest">Link_Status</h3>
                  <span className="text-[9px] font-mono text-secondary/50">v{version}</span>
                </div>
                <div className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                  connected ? "bg-ok/5 border-ok/20 text-ok" : "bg-err/5 border-err/20 text-err"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", connected ? "bg-ok animate-status-pulse" : "bg-err")} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {connected ? "NEURAL_LINK_ESTABLISHED" : "LINK_TERMINATED"}
                    </span>
                  </div>
                  {connected && <CheckCircle2 className="w-4 h-4 opacity-50" />}
                </div>
              </div>

              {/* Console log */}
              <Section icon={Terminal} title="System_Telemetry">
                <div className="bg-black/60 backdrop-blur-xl border border-edge rounded-2xl p-6 h-[500px] overflow-y-auto font-mono relative group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
                  {log.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2">
                      <Terminal className="w-8 h-8" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Command Telemetry…</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {log.map((e, i) => (
                        <p key={i} className={cn(
                          "text-[10px] leading-relaxed transition-colors",
                          e.includes('❌') ? "text-err" : e.includes('✅') ? "text-ok" : "text-secondary group-hover:text-secondary/80"
                        )}>
                          <span className="opacity-30 mr-2">[{i.toString().padStart(2, '0')}]</span>
                          {e}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* ── Kanban Tab ── */}
        {tab === "kanban" && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mt-2">
            <KanbanBoard />
          </motion.div>
        )}

        {/* ── Costs Tab ── */}
        {tab === "costs" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-10">
            <Section icon={DollarSign} title="Sovereign_Resource_Analysis">
              {costs.length === 0 ? (
                <div className="h-64 rounded-2xl border border-dashed border-edge/50 flex flex-col items-center justify-center space-y-4 opacity-30">
                  <DollarSign className="w-10 h-10" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No Cost Data Telemetry Available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {costs.map((c) => (
                    <div
                      key={c.agentId}
                      className="bg-surface-2 border border-edge/60 rounded-2xl p-6 shadow-lg hover:border-accent/40 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-surface-3 border border-edge group-hover:bg-accent/10 group-hover:border-accent/30 transition-all">
                          <Cpu className="w-4 h-4 text-secondary group-hover:text-accent" />
                        </div>
                        <p className="text-xs font-heading font-bold text-foreground uppercase truncate">
                          {c.agentId}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-3xl font-heading font-bold text-ok tracking-tighter">
                          ${c.totalCost.toFixed(4)}
                        </p>
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                          Operational_Expenditure
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-edge/30 flex justify-between items-center">
                        <span className="text-[9px] font-mono text-secondary/50 uppercase">Token_Consumption</span>
                        <span className="text-[10px] font-mono font-bold text-foreground">{(c.totalInput + c.totalOutput).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Helpers ── */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="bg-surface-2 border border-edge/60 rounded-2xl p-6 shadow-lg hover:border-accent/30 transition-all relative overflow-hidden group">
      <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-16 h-16" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("w-3.5 h-3.5", color)} />
        <p className="text-[9px] font-heading font-bold text-secondary uppercase tracking-widest">
          {label}
        </p>
      </div>
      <p className={cn("text-3xl font-heading font-bold tracking-tighter", color)}>{value.toString().padStart(2, '0')}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-1">
        {Icon && <Icon className="w-4 h-4 text-accent" />}
        <h3 className="text-[11px] font-heading font-bold text-secondary uppercase tracking-[.3em]">
          {title}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-edge to-transparent ml-4" />
      </div>
      {children}
    </div>
  );
}

function QuickAction({
  label,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest border rounded-xl transition-all cursor-pointer bg-surface-3 hover:bg-surface-2 active:scale-95 shadow-sm",
        "border-edge/50 hover:border-accent/30",
        color
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
