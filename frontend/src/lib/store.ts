/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DevSwarm — Zustand State Store
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { create } from "zustand";
import type { Agent, Task, Message, AgentCost, ActivityEntry } from "./types";
import { normalizeAgent, normalizeMessage, normalizeTask } from "./types";

type MobileView = "floor" | "kanban" | "agents";

interface Store {
  // ── connection ──
  connected: boolean;
  setConnected: (v: boolean) => void;

  // ── domain ──
  agents: Record<string, Agent>;
  tasks: Task[];
  messages: Message[];
  version: number;

  // ── ui ──
  selectedId: string | null;
  godMode: boolean;
  mobile: MobileView;

  // ── extra ──
  costs: AgentCost[];
  activity: ActivityEntry[];

  // ── actions ──
  applyWSPayload: (d: Record<string, unknown>) => void;
  setAgents: (a: Record<string, Agent>) => void;
  setTasks: (t: Task[]) => void;
  setMessages: (m: Message[]) => void;
  select: (id: string | null) => void;
  toggleGod: () => void;
  setMobile: (v: MobileView) => void;
  setCosts: (c: AgentCost[]) => void;
  setActivity: (a: ActivityEntry[]) => void;

  // ── selectors ──
  agent: () => Agent | null;
  byRoom: (r: string) => Agent[];
  tasksByAgent: (id: string) => Task[];
  tasksByStatus: (s: string) => Task[];
}

export const useStore = create<Store>((set, get) => ({
  connected: false,
  setConnected: (v) => set({ connected: v }),

  agents: {},
  tasks: [],
  messages: [],
  version: 0,

  selectedId: null,
  godMode: false,
  mobile: "floor",

  costs: [],
  activity: [],

  /* ── actions ── */

  applyWSPayload: (d) => {
    const p = d as {
      type?: string;
      agents?: Record<string, Record<string, unknown>>;
      messages?: Record<string, unknown>[];
      tasks?: Record<string, unknown>[];
      version?: number;
    };
    if (p.type !== "STATE_UPDATE") return;

    const merged: Record<string, Agent> = { ...get().agents };
    if (p.agents) {
      for (const [id, raw] of Object.entries(p.agents)) {
        merged[id] = normalizeAgent(raw);
      }
    }
    const msgs = (p.messages ?? []).map((m) => normalizeMessage(m));
    const tsks = (p.tasks ?? []).map((t) => normalizeTask(t));
    set({
      agents: merged,
      messages: msgs.length ? msgs : get().messages,
      tasks: tsks.length ? tsks : get().tasks,
      version: p.version ?? get().version + 1,
    });
  },

  setAgents: (a) => set({ agents: a }),
  setTasks: (t) => set({ tasks: t }),
  setMessages: (m) => set({ messages: m }),
  select: (id) => set({ selectedId: id }),
  toggleGod: () => set((s) => ({ godMode: !s.godMode })),
  setMobile: (v) => set({ mobile: v }),
  setCosts: (c) => set({ costs: c }),
  setActivity: (a) => set({ activity: a }),

  /* ── selectors ── */

  agent: () => {
    const { agents, selectedId } = get();
    return selectedId ? agents[selectedId] ?? null : null;
  },
  byRoom: (r) => Object.values(get().agents).filter((a) => a.room === r),
  tasksByAgent: (id) =>
    get().tasks.filter(
      (t) => t.assignedAgents?.includes(id) || t.createdBy === id,
    ),
  tasksByStatus: (s) => get().tasks.filter((t) => t.status === s),
}));
