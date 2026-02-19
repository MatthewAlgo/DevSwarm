/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DevSwarm — Zustand State Store
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { create } from "zustand";
import type { Agent, Task, Message, AgentCost, ActivityEntry } from "./types";
import { normalizeAgent, normalizeMessage, normalizeTask } from "./types";

type MobileView = "floor" | "kanban" | "agents";
const HIDDEN_AGENT_IDS = new Set(["user"]);

function isVisibleAgentId(agentId: string): boolean {
  return !HIDDEN_AGENT_IDS.has(agentId);
}

function sanitizeAgents(agents: Record<string, Agent>): Record<string, Agent> {
  const sanitized: Record<string, Agent> = {};
  for (const [id, agent] of Object.entries(agents)) {
    if (isVisibleAgentId(id)) {
      sanitized[id] = agent.id === id ? agent : { ...agent, id };
    }
  }
  return sanitized;
}

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
      category?: "agents" | "tasks" | "messages";
      id?: string;
      data?: Record<string, unknown>;
      agents?: Record<string, Record<string, unknown>>;
      messages?: Record<string, unknown>[];
      tasks?: Record<string, unknown>[];
      version?: number;
    };

    if (p.type === "STATE_UPDATE") {
      const merged: Record<string, Agent> = { ...get().agents };
      if (p.agents) {
        for (const [id, raw] of Object.entries(p.agents)) {
          if (!isVisibleAgentId(id)) continue;
          merged[id] = normalizeAgent(raw, id);
        }
      }
      const msgs = (p.messages ?? []).map((m) => normalizeMessage(m));
      const tsks = (p.tasks ?? []).map((t) => normalizeTask(t));
      set({
        agents: sanitizeAgents(merged),
        messages: msgs.length ? msgs : get().messages,
        tasks: tsks.length ? tsks : get().tasks,
        version: p.version ?? get().version + 1,
      });
    } else if (p.type === "DELTA_UPDATE" && p.category && p.id && p.data) {
      if (p.category === "agents") {
        if (!isVisibleAgentId(p.id)) return;
        const agents = { ...get().agents };
        agents[p.id] = normalizeAgent(p.data, p.id);
        set({ agents: sanitizeAgents(agents) });
      } else if (p.category === "tasks") {
        const tasks = [...get().tasks];
        const normalized = normalizeTask(p.data);
        const idx = tasks.findIndex((t) => t.id === p.id);
        if (idx !== -1) {
          tasks[idx] = normalized;
        } else {
          tasks.unshift(normalized);
        }
        set({ tasks });
      } else if (p.category === "messages") {
        const messages = [...get().messages];
        const normalized = normalizeMessage(p.data);
        if (!messages.find((m) => m.id === p.id)) {
          messages.unshift(normalized);
          // Limit list for stability if needed
          if (messages.length > 100) messages.pop();
          set({ messages });
        }
      }
    }
  },

  setAgents: (a) => set({ agents: sanitizeAgents(a) }),
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
    if (!selectedId) return null;
    const selected = agents[selectedId];
    if (!selected) return null;
    return selected.id === selectedId ? selected : { ...selected, id: selectedId };
  },
  byRoom: (r) =>
    Object.entries(get().agents)
      .filter(([, a]) => a.room === r)
      .map(([id, a]) => (a.id === id ? a : { ...a, id })),
  tasksByAgent: (id) =>
    get().tasks.filter(
      (t) => t.assignedAgents?.includes(id) || t.createdBy === id,
    ),
  tasksByStatus: (s) => get().tasks.filter((t) => t.status === s),
}));
