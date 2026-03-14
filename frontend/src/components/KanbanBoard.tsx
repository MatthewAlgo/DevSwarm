"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { AgentDot } from "./AgentAvatar";
import type { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ListTodo, Play, Clock, CheckCircle2, MoreHorizontal, LayoutGrid } from "lucide-react";

const COLS: { id: TaskStatus; label: string; icon: any; color: string }[] = [
  { id: "Backlog", label: "Backlog", icon: ListTodo, color: "text-secondary" },
  { id: "In Progress", label: "In Progress", icon: Play, color: "text-accent" },
  { id: "Review", label: "Review", icon: Clock, color: "text-warn" },
  { id: "Done", label: "Done", icon: CheckCircle2, color: "text-ok" },
];

export default function KanbanBoard() {
  const { tasks, agents, tasksByStatus } = useStore();

  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-surface-2 rounded-2xl animate-pulse" />
            <LayoutGrid className="w-10 h-10 text-secondary opacity-20" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-heading font-bold text-foreground uppercase tracking-widest">
              No Directives Queued
            </h2>
            <p className="text-secondary text-[10px] uppercase tracking-tighter">
              Tasks will manifest here upon swarm initialization.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-edge/50 pb-4">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-surface-3 border border-edge">
                <LayoutGrid className="w-4 h-4 text-accent" />
            </div>
            <div className="flex flex-col">
                <h2 className="text-[10px] font-heading font-bold text-foreground uppercase tracking-[.2em]">
                    Swarm Task Board
                </h2>
                <span className="text-[8px] text-secondary font-bold uppercase tracking-tighter">
                    Real-time Coordination Matrix
                </span>
            </div>
        </div>
        <div className="flex items-center gap-2 bg-surface-3 px-3 py-1.5 rounded-full border border-edge">
            <span className="text-[10px] text-foreground font-mono font-bold">{tasks.length}</span>
            <span className="text-[9px] text-secondary font-bold uppercase tracking-widest">Active_Tasks</span>
        </div>
      </div>

      {/* Columns */}
      <div className="kanban-grid items-start">
        {COLS.map((col) => {
          const items = tasksByStatus(col.id);
          const Icon = col.icon;

          return (
            <div key={col.id} className="space-y-4">
              {/* Column header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Icon className={cn("w-3.5 h-3.5", col.color)} />
                    <span className="text-[10px] font-heading font-bold text-foreground uppercase tracking-widest">
                        {col.label}
                    </span>
                </div>
                <span className="text-[9px] font-mono font-bold text-secondary tabular-nums bg-surface-2 px-2 py-0.5 rounded-md border border-edge/50">
                    {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3 min-h-[200px] p-1">
                <AnimatePresence mode="popLayout">
                    {items.map((task, i) => (
                    <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: i * 0.02 }}
                        className="group bg-surface-2/50 backdrop-blur-sm border border-edge/60 rounded-xl p-4 hover:border-accent/40 hover:bg-surface-2 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-3 h-3 text-secondary" />
                        </div>

                        <div className="flex flex-col space-y-3 relative z-10">
                            <h3 className="text-[11px] font-bold text-foreground leading-snug group-hover:text-accent transition-colors">
                                {task.title}
                            </h3>
                            
                            {task.description && (
                                <p className="text-[9px] text-secondary line-clamp-2 leading-relaxed font-medium">
                                    {task.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between mt-2">
                                {/* Assigned agents */}
                                <div className="flex -space-x-2">
                                    {task.assignedAgents?.slice(0, 4).map((aid) => (
                                        <div key={aid} className="ring-2 ring-surface-2 rounded-lg transition-transform hover:scale-110 hover:z-10">
                                            <AgentDot agent={agents[aid]} size={22} />
                                        </div>
                                    ))}
                                    {task.assignedAgents && task.assignedAgents.length > 4 && (
                                        <div className="w-5.5 h-5.5 rounded-lg bg-surface-3 border border-edge flex items-center justify-center text-[8px] font-bold text-secondary ring-2 ring-surface-2">
                                            +{task.assignedAgents.length - 4}
                                        </div>
                                    )}
                                </div>

                                {/* Priority */}
                                {task.priority > 0 && (
                                    <div className={cn(
                                        "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter border",
                                        task.priority >= 4
                                            ? "bg-err/10 border-err/20 text-err"
                                            : task.priority >= 2
                                                ? "bg-warn/10 border-warn/20 text-warn"
                                                : "bg-surface-3 border-edge text-secondary"
                                    )}>
                                        PRIORITY_P{task.priority}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Background Highlight */}
                        <div className="absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: col.id === "In Progress" ? "var(--color-accent)" : col.id === "Done" ? "var(--color-ok)" : col.id === "Review" ? "var(--color-warn)" : "var(--color-secondary)" }} />
                    </motion.div>
                    ))}
                </AnimatePresence>
                {items.length === 0 && (
                    <div className="h-32 rounded-xl border border-dashed border-edge/30 flex items-center justify-center bg-surface-3/20">
                        <span className="text-[8px] font-bold text-secondary/30 uppercase tracking-widest">Sector_Idle</span>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
