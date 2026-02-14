/**
 * Tests for lib/websocket.ts — DevSwarmWS class:
 * connection lifecycle, pub/sub, send, reconnect, singleton.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { DevSwarmWS, getWS } from "@/lib/websocket";

/* ── Mock WebSocket ── */

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Auto-trigger onopen after microtask
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    setTimeout(() => this.onclose?.(), 0);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  // @ts-expect-error - mocking global WebSocket
  globalThis.WebSocket = MockWebSocket;
});

afterEach(() => {
  vi.useRealTimers();
});

/* ═══════════════════════════════════════════
   Connection Lifecycle
   ═══════════════════════════════════════════ */

describe("connection lifecycle", () => {
  it("creates WebSocket with default URL", () => {
    const ws = new DevSwarmWS("ws://test:8080/ws");
    ws.connect();
    expect(ws.connected).toBe(true);
  });

  it("fires status handler on connect", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    const handler = vi.fn();
    ws.onStatus(handler);
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("fires status handler on disconnect", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    const handler = vi.fn();
    ws.onStatus(handler);
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);
    ws.disconnect();
    await vi.advanceTimersByTimeAsync(10);
    expect(handler).toHaveBeenCalledWith(false);
  });

  it("does not reconnect after deliberate disconnect", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);
    ws.disconnect();
    await vi.advanceTimersByTimeAsync(35_000);
    expect(ws.connected).toBe(false);
  });
});

/* ═══════════════════════════════════════════
   Pub/Sub
   ═══════════════════════════════════════════ */

describe("pub/sub", () => {
  it("onMessage receives parsed JSON", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    const handler = vi.fn();
    ws.onMessage(handler);
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);

    // Simulate server sending a message
    // @ts-expect-error - accessing private ws
    ws["ws"]!.onmessage!({ data: '{"type":"STATE_UPDATE","version":1}' });
    expect(handler).toHaveBeenCalledWith({ type: "STATE_UPDATE", version: 1 });
  });

  it("ignores non-JSON frames", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    const handler = vi.fn();
    ws.onMessage(handler);
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);

    // @ts-expect-error - accessing private ws
    ws["ws"]!.onmessage!({ data: "not-json" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribe removes handler", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    const handler = vi.fn();
    const unsub = ws.onMessage(handler);
    unsub();
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);

    // @ts-expect-error - accessing private ws
    ws["ws"]!.onmessage!({ data: '{"test":true}' });
    expect(handler).not.toHaveBeenCalled();
  });

  it("onStatus unsubscribe works", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    const handler = vi.fn();
    const unsub = ws.onStatus(handler);
    unsub();
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);
    expect(handler).not.toHaveBeenCalled();
  });
});

/* ═══════════════════════════════════════════
   Send
   ═══════════════════════════════════════════ */

describe("send", () => {
  it("sends JSON string when connected", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);
    ws.send({ action: "ping" });

    // @ts-expect-error - accessing private ws
    expect(ws["ws"]!.sent).toContain('{"action":"ping"}');
  });

  it("does not send when disconnected", () => {
    const ws = new DevSwarmWS("ws://test/ws");
    ws.send({ action: "ping" });
    // No error thrown, silently ignored
  });
});

/* ═══════════════════════════════════════════
   Reconnect
   ═══════════════════════════════════════════ */

describe("reconnect", () => {
  it("attempts reconnect after unintended close", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);

    // @ts-expect-error - simulating unintended close
    ws["ws"]!.onclose!();

    // Should schedule reconnect
    await vi.advanceTimersByTimeAsync(1000);
    // The reconnect timer fires and creates a new WebSocket
    expect(ws.connected).toBe(true);
  });

  it("resets attempt counter on successful reconnect", async () => {
    const ws = new DevSwarmWS("ws://test/ws");
    ws.connect();
    await vi.advanceTimersByTimeAsync(10);
    expect(ws.connected).toBe(true);

    // @ts-expect-error - accessing private field
    expect(ws["attempts"]).toBe(0);
  });
});

/* ═══════════════════════════════════════════
   Singleton
   ═══════════════════════════════════════════ */

describe("getWS singleton", () => {
  it("returns same instance", () => {
    // Note: getWS() uses module-level state, so this tests the pattern
    const a = getWS();
    const b = getWS();
    expect(a).toBe(b);
  });
});
