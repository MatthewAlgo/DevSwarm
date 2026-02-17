/**
 * Tests for lib/api.ts — REST client fetch calls with mocked fetch.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { api } from "@/lib/api";

/* Mock global fetch */
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function okJSON(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, body: string) {
  return new Response(body, { status, statusText: "Error" });
}

beforeEach(() => {
  mockFetch.mockReset();
});

/* ═══════════════════════════════════════════
   GET Endpoints
   ═══════════════════════════════════════════ */

describe("GET endpoints", () => {
  it("getAgents calls /api/agents", async () => {
    mockFetch.mockResolvedValueOnce(okJSON([{ id: "marco" }]));
    const result = await api.getAgents();
    expect(result).toEqual([{ id: "marco" }]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/agents"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("getAgent calls /api/agents/:id", async () => {
    mockFetch.mockResolvedValueOnce(okJSON({ id: "marco", name: "Marco" }));
    const result = await api.getAgent("marco");
    expect(result.id).toBe("marco");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/agents/marco"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("getTasks without filter", async () => {
    mockFetch.mockResolvedValueOnce(okJSON([]));
    await api.getTasks();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("getTasks with agent filter", async () => {
    mockFetch.mockResolvedValueOnce(okJSON([]));
    await api.getTasks("marco");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("agent_id=marco"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("getMessages with default limit", async () => {
    mockFetch.mockResolvedValueOnce(okJSON([]));
    await api.getMessages();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=50"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("getMessages with custom limit", async () => {
    mockFetch.mockResolvedValueOnce(okJSON([]));
    await api.getMessages(10);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=10"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("getState", async () => {
    mockFetch.mockResolvedValueOnce(okJSON({ version: 1 }));
    const result = await api.getState();
    expect(result.version).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/state"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("getCosts", async () => {
    mockFetch.mockResolvedValueOnce(okJSON([]));
    await api.getCosts();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/costs"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("getActivity with default limit", async () => {
    mockFetch.mockResolvedValueOnce(okJSON([]));
    await api.getActivity();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=50"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });
});

/* ═══════════════════════════════════════════
   POST / PATCH Endpoints
   ═══════════════════════════════════════════ */

describe("POST endpoints", () => {
  it("createTask sends POST with body", async () => {
    mockFetch.mockResolvedValueOnce(okJSON({ id: "task-1" }));
    const result = await api.createTask({ title: "Test" });
    expect(result.id).toBe("task-1");
    const call = mockFetch.mock.calls[0];
    expect(call[1].method).toBe("POST");
    expect(JSON.parse(call[1].body)).toEqual({ title: "Test" });
  });

  it("sendMessage sends POST", async () => {
    mockFetch.mockResolvedValueOnce(okJSON({ id: "msg-1" }));
    await api.sendMessage({ fromAgent: "marco", content: "Hello" });
    const call = mockFetch.mock.calls[0];
    expect(call[1].method).toBe("POST");
  });

  it("overrideState sends POST to /state/override", async () => {
    mockFetch.mockResolvedValueOnce(okJSON({ ok: true }));
    await api.overrideState({ global_status: "Clocked Out" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/state/override"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("triggerGoal sends POST to Go gateway (proxied)", async () => {
    mockFetch.mockResolvedValueOnce(okJSON({ ok: true }));
    await api.triggerGoal("Research AI", ["mona"]);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain("8080"); // Go port
    const body = JSON.parse(call[1].body);
    expect(body.goal).toBe("Research AI");
    expect(body.assigned_to).toEqual(["mona"]);
  });

  it("simulateActivity sends POST to Python engine", async () => {
    mockFetch.mockResolvedValueOnce(okJSON({}));
    await api.simulateActivity();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/simulate/activity"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("PATCH endpoints", () => {
  it("updateAgent sends PATCH", async () => {
    mockFetch.mockResolvedValueOnce(okJSON({}));
    await api.updateAgent("marco", { status: "Working" });
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain("/agents/marco");
    expect(call[1].method).toBe("PATCH");
  });

  it("updateTaskStatus sends PATCH", async () => {
    mockFetch.mockResolvedValueOnce(okJSON({}));
    await api.updateTaskStatus("task-1", "Done");
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain("/tasks/task-1/status");
    expect(JSON.parse(call[1].body)).toEqual({ status: "Done" });
  });
});

/* ═══════════════════════════════════════════
   Error Handling
   ═══════════════════════════════════════════ */

describe("error handling", () => {
  it("throws on non-OK GET response", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(404, "Not Found"));
    await expect(api.getAgent("unknown")).rejects.toThrow("404");
  });

  it("throws on non-OK POST response", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(400, "Bad Request"));
    await expect(
      api.createTask({ title: "" }),
    ).rejects.toThrow("400");
  });

  it("throws on non-OK PATCH response", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500, "Internal Error"));
    await expect(
      api.updateAgent("marco", {}),
    ).rejects.toThrow("500");
  });
});
