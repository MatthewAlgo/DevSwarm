/**
 * Shared test fixtures — mock agents, tasks, messages, WS payloads.
 * Single source of truth for all test data.
 */
import type { Agent, Task, Message, AgentCost, ActivityEntry } from "@/lib/types";

/* ── Agents ── */

export const ORCHESTRATOR: Agent = {
  id: "orchestrator",
  name: "Orchestrator",
  role: "CEO & Orchestrator",
  room: "Private Office",
  status: "Working",
  currentTask: "Coordinating sprint",
  thoughtChain: "Analyzing team capacity...",
  techStack: ["LangGraph", "MCP"],
  avatarColor: "#8b5cf6",
  updatedAt: "2026-02-15T00:00:00Z",
};

export const RESEARCHER: Agent = {
  id: "researcher",
  name: "Researcher",
  role: "Deep Researcher",
  room: "War Room",
  status: "Idle",
  currentTask: "",
  thoughtChain: "",
  techStack: ["Python", "ArXiv"],
  avatarColor: "#06b6d4",
  updatedAt: "2026-02-15T00:00:00Z",
};

export const DEVOPS: Agent = {
  id: "devops",
  name: "DevOps",
  role: "DevOps Monitor",
  room: "Server Room",
  status: "Error",
  currentTask: "Monitoring",
  thoughtChain: "System health check...",
  techStack: ["Docker", "K8s"],
  avatarColor: "#ef4444",
  updatedAt: "2026-02-15T00:00:00Z",
};

export const CLOCKED_OUT_AGENT: Agent = {
  id: "frontend_designer",
  name: "Frontend Designer",
  role: "Designer",
  room: "Desks",
  status: "Clocked Out",
  currentTask: "",
  thoughtChain: "",
  techStack: ["Figma"],
  avatarColor: "#f59e0b",
  updatedAt: "2026-02-15T00:00:00Z",
};

export const ALL_AGENTS: Record<string, Agent> = {
  orchestrator: ORCHESTRATOR,
  researcher: RESEARCHER,
  devops: DEVOPS,
  frontend_designer: CLOCKED_OUT_AGENT,
};

/* ── Tasks ── */

export const TASK_BACKLOG: Task = {
  id: "task-1",
  title: "Research AI frameworks",
  description: "Deep dive into LangGraph vs CrewAI",
  status: "Backlog",
  priority: 3,
  createdBy: "orchestrator",
  assignedAgents: ["researcher"],
  createdAt: "2026-02-14T10:00:00Z",
  updatedAt: "2026-02-14T10:00:00Z",
};

export const TASK_IN_PROGRESS: Task = {
  id: "task-2",
  title: "Deploy monitoring stack",
  description: "Setup Grafana + Prometheus",
  status: "In Progress",
  priority: 5,
  createdBy: "devops",
  assignedAgents: ["devops"],
  createdAt: "2026-02-14T11:00:00Z",
  updatedAt: "2026-02-14T12:00:00Z",
};

export const TASK_DONE: Task = {
  id: "task-3",
  title: "Create landing page",
  description: "",
  status: "Done",
  priority: 1,
  createdBy: "orchestrator",
  assignedAgents: ["frontend_designer"],
  createdAt: "2026-02-13T09:00:00Z",
  updatedAt: "2026-02-14T15:00:00Z",
};

export const ALL_TASKS: Task[] = [TASK_BACKLOG, TASK_IN_PROGRESS, TASK_DONE];

/* ── Messages ── */

export const MESSAGE_DELEGATION: Message = {
  id: "msg-1",
  fromAgent: "orchestrator",
  toAgent: "researcher",
  content: "Research AI agent frameworks",
  messageType: "delegation",
  createdAt: "2026-02-15T00:01:00Z",
};

export const MESSAGE_CHAT: Message = {
  id: "msg-2",
  fromAgent: "devops",
  toAgent: "orchestrator",
  content: "System recovered",
  messageType: "chat",
  createdAt: "2026-02-15T00:02:00Z",
};

export const ALL_MESSAGES: Message[] = [MESSAGE_DELEGATION, MESSAGE_CHAT];

/* ── WebSocket payloads ── */

export const WS_STATE_UPDATE = {
  type: "STATE_UPDATE",
  agents: {
    orchestrator: {
      id: "orchestrator",
      name: "Orchestrator",
      role: "CEO",
      room: "Private Office",
      status: "Working",
      current_task: "Sprint planning",
      avatar_color: "#8b5cf6",
    },
    researcher: {
      id: "researcher",
      name: "Researcher",
      role: "Researcher",
      room: "War Room",
      status: "Idle",
    },
  },
  messages: [
    {
      id: "msg-1",
      from_agent: "orchestrator",
      to_agent: "researcher",
      content: "Start research",
      message_type: "delegation",
    },
  ],
  version: 42,
};

export const WS_INVALID_TYPE = {
  type: "HEARTBEAT",
  version: 1,
};

/* ── Costs & Activity ── */

export const COST_ORCHESTRATOR: AgentCost = {
  agentId: "orchestrator",
  totalInput: 5000,
  totalOutput: 2000,
  totalCost: 0.025,
};

export const ACTIVITY_ENTRY: ActivityEntry = {
  id: "act-1",
  agentId: "orchestrator",
  action: "task_created",
  details: { taskId: "task-1", title: "Research" },
  createdAt: "2026-02-15T00:05:00Z",
};
