/**
 * Tests for lib/store.ts — Zustand store: actions, selectors, WS payload processing.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store";
import {
  ORCHESTRATOR,
  RESEARCHER,
  DEVOPS,
  ALL_AGENTS,
  ALL_TASKS,
  ALL_MESSAGES,
  TASK_BACKLOG,
  TASK_IN_PROGRESS,
  TASK_DONE,
  WS_STATE_UPDATE,
  WS_INVALID_TYPE,
  COST_ORCHESTRATOR,
  ACTIVITY_ENTRY,
} from "../helpers/fixtures";

/* Reset store before each test */
beforeEach(() => {
  useStore.setState({
    connected: false,
    agents: {},
    tasks: [],
    messages: [],
    version: 0,
    selectedId: null,
    godMode: false,
    mobile: "floor",
    costs: [],
    activity: [],
  });
});

/* ═══════════════════════════════════════════
   Initial State
   ═══════════════════════════════════════════ */

describe("initial state", () => {
  it("starts disconnected", () => {
    expect(useStore.getState().connected).toBe(false);
  });

  it("starts with empty collections", () => {
    const s = useStore.getState();
    expect(Object.keys(s.agents)).toHaveLength(0);
    expect(s.tasks).toHaveLength(0);
    expect(s.messages).toHaveLength(0);
  });

  it("starts with version 0", () => {
    expect(useStore.getState().version).toBe(0);
  });

  it("starts with no selection", () => {
    expect(useStore.getState().selectedId).toBeNull();
  });

  it("starts with god mode off", () => {
    expect(useStore.getState().godMode).toBe(false);
  });
});

/* ═══════════════════════════════════════════
   Setters
   ═══════════════════════════════════════════ */

describe("setters", () => {
  it("setConnected", () => {
    useStore.getState().setConnected(true);
    expect(useStore.getState().connected).toBe(true);
  });

  it("setAgents", () => {
    useStore.getState().setAgents(ALL_AGENTS);
    expect(Object.keys(useStore.getState().agents)).toHaveLength(4);
  });

  it("setAgents filters hidden user agent", () => {
    useStore.getState().setAgents({
      ...ALL_AGENTS,
      user: {
        ...ORCHESTRATOR,
        id: "user",
        name: "User",
      },
    });
    expect(useStore.getState().agents.user).toBeUndefined();
  });

  it("setAgents aligns agent.id with map key", () => {
    useStore.getState().setAgents({
      researcher: {
        ...RESEARCHER,
        id: "wrong-id",
      },
    });
    expect(useStore.getState().agents.researcher.id).toBe("researcher");
  });

  it("setTasks", () => {
    useStore.getState().setTasks(ALL_TASKS);
    expect(useStore.getState().tasks).toHaveLength(3);
  });

  it("setMessages", () => {
    useStore.getState().setMessages(ALL_MESSAGES);
    expect(useStore.getState().messages).toHaveLength(2);
  });

  it("select / deselect", () => {
    useStore.getState().select("orchestrator");
    expect(useStore.getState().selectedId).toBe("orchestrator");
    useStore.getState().select(null);
    expect(useStore.getState().selectedId).toBeNull();
  });

  it("toggleGod", () => {
    useStore.getState().toggleGod();
    expect(useStore.getState().godMode).toBe(true);
    useStore.getState().toggleGod();
    expect(useStore.getState().godMode).toBe(false);
  });

  it("setMobile", () => {
    useStore.getState().setMobile("kanban");
    expect(useStore.getState().mobile).toBe("kanban");
  });

  it("setCosts", () => {
    useStore.getState().setCosts([COST_ORCHESTRATOR]);
    expect(useStore.getState().costs).toHaveLength(1);
  });

  it("setActivity", () => {
    useStore.getState().setActivity([ACTIVITY_ENTRY]);
    expect(useStore.getState().activity).toHaveLength(1);
  });
});

/* ═══════════════════════════════════════════
   applyWSPayload
   ═══════════════════════════════════════════ */

describe("applyWSPayload", () => {
  it("applies STATE_UPDATE with agents and messages", () => {
    useStore.getState().applyWSPayload(WS_STATE_UPDATE);
    const s = useStore.getState();
    expect(Object.keys(s.agents)).toHaveLength(2);
    expect(s.agents.orchestrator.status).toBe("Working");
    expect(s.agents.researcher.room).toBe("War Room");
    expect(s.messages).toHaveLength(1);
    expect(s.version).toBe(42);
  });

  it("ignores non-STATE_UPDATE payloads", () => {
    useStore.getState().applyWSPayload(WS_INVALID_TYPE);
    expect(Object.keys(useStore.getState().agents)).toHaveLength(0);
  });

  it("merges agents (does not replace)", () => {
    // Pre-populate with DEVOPS
    useStore.getState().setAgents({ devops: DEVOPS });
    // Apply update that only has orchestrator + researcher
    useStore.getState().applyWSPayload(WS_STATE_UPDATE);
    const agents = useStore.getState().agents;
    expect(Object.keys(agents)).toHaveLength(3); // devops + orchestrator + researcher
    expect(agents.devops.name).toBe("DevOps");
  });

  it("filters hidden user agent from state updates", () => {
    useStore.getState().applyWSPayload({
      type: "STATE_UPDATE",
      agents: {
        user: {
          id: "user",
          name: "User",
          role: "Human Administrator",
          room: "Private Office",
          status: "Idle",
        },
      },
      version: 1,
    });
    expect(useStore.getState().agents.user).toBeUndefined();
  });

  it("normalises snake_case fields from WS", () => {
    useStore.getState().applyWSPayload(WS_STATE_UPDATE);
    const orchestrator = useStore.getState().agents.orchestrator;
    expect(orchestrator.currentTask).toBe("Sprint planning");
    expect(orchestrator.avatarColor).toBe("#8b5cf6");
  });

  it("uses WS map key as fallback ID when data omits id", () => {
    useStore.getState().applyWSPayload({
      type: "STATE_UPDATE",
      agents: {
        researcher: {
          name: "Researcher",
          role: "Researcher",
          room: "War Room",
          status: "Idle",
        },
      },
      version: 2,
    });
    expect(useStore.getState().agents.researcher.id).toBe("researcher");
  });

  it("keeps existing messages if payload has none", () => {
    useStore.getState().setMessages(ALL_MESSAGES);
    useStore.getState().applyWSPayload({
      type: "STATE_UPDATE",
      agents: {},
      version: 99,
    });
    expect(useStore.getState().messages).toHaveLength(2);
  });

  it("increments version when not provided", () => {
    useStore.getState().applyWSPayload({
      type: "STATE_UPDATE",
      agents: {},
    });
    expect(useStore.getState().version).toBe(1);
  });
});

/* ═══════════════════════════════════════════
   Selectors
   ═══════════════════════════════════════════ */

describe("selectors", () => {
  beforeEach(() => {
    useStore.setState({
      agents: ALL_AGENTS,
      tasks: ALL_TASKS,
      selectedId: "orchestrator",
    });
  });

  describe("agent()", () => {
    it("returns selected agent", () => {
      expect(useStore.getState().agent()?.name).toBe("Orchestrator");
    });

    it("returns null when no selection", () => {
      useStore.getState().select(null);
      expect(useStore.getState().agent()).toBeNull();
    });

    it("returns null for non-existent agent", () => {
      useStore.getState().select("nonexistent");
      expect(useStore.getState().agent()).toBeNull();
    });
  });

  describe("byRoom()", () => {
    it("returns agents in given room", () => {
      const warRoom = useStore.getState().byRoom("War Room");
      expect(warRoom).toHaveLength(1);
      expect(warRoom[0].id).toBe("researcher");
    });

    it("returns empty array for empty room", () => {
      expect(useStore.getState().byRoom("Lounge")).toHaveLength(0);
    });
  });

  describe("tasksByAgent()", () => {
    it("finds tasks assigned to agent", () => {
      const tasks = useStore.getState().tasksByAgent("researcher");
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Research AI frameworks");
    });

    it("finds tasks created by agent", () => {
      const tasks = useStore.getState().tasksByAgent("orchestrator");
      expect(tasks).toHaveLength(2); // created task-1 + task-3
    });

    it("returns empty for unknown agent", () => {
      expect(useStore.getState().tasksByAgent("unknown")).toHaveLength(0);
    });
  });

  describe("tasksByStatus()", () => {
    it("filters by status", () => {
      expect(useStore.getState().tasksByStatus("Backlog")).toHaveLength(1);
      expect(useStore.getState().tasksByStatus("In Progress")).toHaveLength(1);
      expect(useStore.getState().tasksByStatus("Done")).toHaveLength(1);
    });

    it("returns empty for unused status", () => {
      expect(useStore.getState().tasksByStatus("Blocked")).toHaveLength(0);
    });
  });
});
