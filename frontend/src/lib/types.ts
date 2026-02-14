/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DevSwarm — Domain Types & Constants
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ── Enums ──

export type AgentStatus =
  | "Idle"
  | "Working"
  | "Meeting"
  | "Error"
  | "Clocked Out";

export type RoomType =
  | "Private Office"
  | "War Room"
  | "Desks"
  | "Lounge"
  | "Server Room";

export type TaskStatus =
  | "Backlog"
  | "In Progress"
  | "Review"
  | "Done"
  | "Blocked";

// ── Models ──

export interface Agent {
  id: string;
  name: string;
  role: string;
  room: RoomType;
  status: AgentStatus;
  currentTask: string;
  thoughtChain: string;
  techStack: string[];
  avatarColor: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  createdBy: string;
  assignedAgents: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  fromAgent: string;
  toAgent: string;
  content: string;
  messageType: string;
  createdAt: string;
}

export interface AgentCost {
  agentId: string;
  totalInput: number;
  totalOutput: number;
  totalCost: number;
}

export interface ActivityEntry {
  id: string;
  agentId: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface WSPayload {
  type: string;
  agents: Record<string, Record<string, unknown>>;
  messages?: Record<string, unknown>[];
  tasks?: Record<string, unknown>[];
  version: number;
}

// ── Normalisers (snake_case API → camelCase client) ──

/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeAgent(raw: any): Agent {
  return {
    id: raw.id ?? "",
    name: raw.name ?? "",
    role: raw.role ?? "",
    room: raw.room ?? raw.current_room ?? "Desks",
    status: raw.status ?? "Idle",
    currentTask: raw.currentTask ?? raw.current_task ?? "",
    thoughtChain: raw.thoughtChain ?? raw.thought_chain ?? "",
    techStack: raw.techStack ?? raw.tech_stack ?? [],
    avatarColor: raw.avatarColor ?? raw.avatar_color ?? "#8b5cf6",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? "",
  };
}

export function normalizeTask(raw: any): Task {
  return {
    id: raw.id ?? "",
    title: raw.title ?? "",
    description: raw.description ?? "",
    status: raw.status ?? "Backlog",
    priority: raw.priority ?? 0,
    createdBy: raw.createdBy ?? raw.created_by ?? "",
    assignedAgents: raw.assignedAgents ?? raw.assigned_agents ?? [],
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? "",
  };
}

export function normalizeMessage(raw: any): Message {
  return {
    id: raw.id ?? "",
    fromAgent: raw.fromAgent ?? raw.from_agent ?? "",
    toAgent: raw.toAgent ?? raw.to_agent ?? "",
    content: raw.content ?? "",
    messageType: raw.messageType ?? raw.message_type ?? "chat",
    createdAt: raw.createdAt ?? raw.created_at ?? "",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Constants ──

export const ROOMS: RoomType[] = [
  "Private Office",
  "War Room",
  "Desks",
  "Lounge",
  "Server Room",
];

export const ROOM_ICON: Record<RoomType, string> = {
  "Private Office": "🏢",
  "War Room": "⚔️",
  Desks: "💻",
  Lounge: "☕",
  "Server Room": "🖥️",
};

export const STATUS_THEME: Record<
  AgentStatus,
  { ring: string; dot: string; glow: string }
> = {
  Idle: { ring: "#525252", dot: "#525252", glow: "none" },
  Working: {
    ring: "#10b981",
    dot: "#10b981",
    glow: "0 0 18px rgba(16,185,129,.55)",
  },
  Meeting: {
    ring: "#f59e0b",
    dot: "#f59e0b",
    glow: "0 0 12px rgba(245,158,11,.4)",
  },
  Error: {
    ring: "#ef4444",
    dot: "#ef4444",
    glow: "0 0 20px rgba(239,68,68,.55)",
  },
  "Clocked Out": { ring: "#262626", dot: "#262626", glow: "none" },
};
