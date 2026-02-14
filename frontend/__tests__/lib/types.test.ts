/**
 * Tests for lib/types.ts — normalisers, constants, type guards.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeAgent,
  normalizeTask,
  normalizeMessage,
  ROOMS,
  ROOM_ICON,
  STATUS_THEME,
} from "@/lib/types";
import type { Agent, Task, Message, AgentStatus, RoomType } from "@/lib/types";

/* ═══════════════════════════════════════════
   normalizeAgent
   ═══════════════════════════════════════════ */

describe("normalizeAgent", () => {
  it("normalises camelCase input", () => {
    const a = normalizeAgent({
      id: "marco",
      name: "Marco",
      role: "CEO",
      room: "War Room",
      status: "Working",
      currentTask: "Deploy",
      avatarColor: "#abc",
    });
    expect(a.id).toBe("marco");
    expect(a.room).toBe("War Room");
    expect(a.currentTask).toBe("Deploy");
    expect(a.avatarColor).toBe("#abc");
  });

  it("normalises snake_case API response", () => {
    const a = normalizeAgent({
      id: "bob",
      name: "Bob",
      current_room: "Server Room",
      current_task: "Monitoring",
      thought_chain: "Checking...",
      tech_stack: ["Docker"],
      avatar_color: "#f00",
      updated_at: "2026-01-01",
    });
    expect(a.room).toBe("Server Room");
    expect(a.currentTask).toBe("Monitoring");
    expect(a.thoughtChain).toBe("Checking...");
    expect(a.techStack).toEqual(["Docker"]);
    expect(a.avatarColor).toBe("#f00");
    expect(a.updatedAt).toBe("2026-01-01");
  });

  it("applies defaults for missing fields", () => {
    const a = normalizeAgent({});
    expect(a.id).toBe("");
    expect(a.name).toBe("");
    expect(a.room).toBe("Desks");
    expect(a.status).toBe("Idle");
    expect(a.currentTask).toBe("");
    expect(a.techStack).toEqual([]);
    expect(a.avatarColor).toBe("#8b5cf6");
  });

  it("prefers camelCase over snake_case when both present", () => {
    const a = normalizeAgent({
      currentTask: "camel",
      current_task: "snake",
    });
    expect(a.currentTask).toBe("camel");
  });
});

/* ═══════════════════════════════════════════
   normalizeTask
   ═══════════════════════════════════════════ */

describe("normalizeTask", () => {
  it("normalises camelCase", () => {
    const t = normalizeTask({
      id: "1",
      title: "Research",
      status: "In Progress",
      createdBy: "marco",
      assignedAgents: ["mona"],
    });
    expect(t.status).toBe("In Progress");
    expect(t.assignedAgents).toEqual(["mona"]);
  });

  it("normalises snake_case", () => {
    const t = normalizeTask({
      id: "2",
      title: "Build",
      created_by: "bob",
      assigned_agents: ["bob", "jimmy"],
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    });
    expect(t.createdBy).toBe("bob");
    expect(t.assignedAgents).toEqual(["bob", "jimmy"]);
    expect(t.createdAt).toBe("2026-01-01");
  });

  it("defaults", () => {
    const t = normalizeTask({});
    expect(t.status).toBe("Backlog");
    expect(t.priority).toBe(0);
    expect(t.assignedAgents).toEqual([]);
  });
});

/* ═══════════════════════════════════════════
   normalizeMessage
   ═══════════════════════════════════════════ */

describe("normalizeMessage", () => {
  it("normalises camelCase", () => {
    const m = normalizeMessage({
      id: "1",
      fromAgent: "marco",
      toAgent: "mona",
      content: "Hello",
      messageType: "delegation",
    });
    expect(m.fromAgent).toBe("marco");
    expect(m.messageType).toBe("delegation");
  });

  it("normalises snake_case", () => {
    const m = normalizeMessage({
      from_agent: "bob",
      to_agent: "marco",
      message_type: "status_report",
      created_at: "2026-01-01",
    });
    expect(m.fromAgent).toBe("bob");
    expect(m.toAgent).toBe("marco");
    expect(m.messageType).toBe("status_report");
  });

  it("defaults", () => {
    const m = normalizeMessage({});
    expect(m.messageType).toBe("chat");
    expect(m.content).toBe("");
  });
});

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

describe("ROOMS constant", () => {
  it("has all 5 rooms", () => {
    expect(ROOMS).toHaveLength(5);
  });

  it("contains expected rooms", () => {
    expect(ROOMS).toContain("Private Office");
    expect(ROOMS).toContain("War Room");
    expect(ROOMS).toContain("Desks");
    expect(ROOMS).toContain("Lounge");
    expect(ROOMS).toContain("Server Room");
  });
});

describe("ROOM_ICON", () => {
  it("has an icon for every room", () => {
    for (const room of ROOMS) {
      expect(ROOM_ICON[room]).toBeDefined();
      expect(typeof ROOM_ICON[room]).toBe("string");
    }
  });
});

describe("STATUS_THEME", () => {
  const statuses: AgentStatus[] = [
    "Idle",
    "Working",
    "Meeting",
    "Error",
    "Clocked Out",
  ];

  it("has theme for every status", () => {
    for (const s of statuses) {
      expect(STATUS_THEME[s]).toBeDefined();
      expect(STATUS_THEME[s].ring).toBeDefined();
      expect(STATUS_THEME[s].dot).toBeDefined();
      expect(STATUS_THEME[s].glow).toBeDefined();
    }
  });

  it("Working status has green glow", () => {
    expect(STATUS_THEME.Working.glow).toContain("rgba(16,185,129");
  });

  it("Error status has red glow", () => {
    expect(STATUS_THEME.Error.glow).toContain("rgba(239,68,68");
  });

  it("Idle has no glow", () => {
    expect(STATUS_THEME.Idle.glow).toBe("none");
  });
});
