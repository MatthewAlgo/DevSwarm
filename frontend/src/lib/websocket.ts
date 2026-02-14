/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DevSwarm — WebSocket Client
   Auto-reconnect with exponential backoff
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type OnMessage = (data: unknown) => void;
type OnStatus = (connected: boolean) => void;

export class DevSwarmWS {
  private ws: WebSocket | null = null;
  private url: string;
  private msgHandlers: OnMessage[] = [];
  private statusHandlers: OnStatus[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private closed = false;

  constructor(url?: string) {
    this.url =
      url ??
      (typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws"
        : "ws://localhost:8080/ws");
  }

  /* ── lifecycle ── */

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.closed = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.attempts = 0;
        this.fire(true);
      };

      this.ws.onmessage = (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data);
          this.msgHandlers.forEach((h) => h(d));
        } catch {
          /* ignore non-JSON frames */
        }
      };

      this.ws.onclose = () => {
        this.fire(false);
        if (!this.closed) this.reconnect();
      };

      this.ws.onerror = () => {
        /* onclose will fire after this */
      };
    } catch {
      this.reconnect();
    }
  }

  disconnect(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      // If still connecting, we can't close "nicely" without a warning in some browsers
      // but we should still try to null it or set a flag to ignore the open.
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
    } else {
      this.ws?.close(1000, "client_disconnect");
    }
    this.ws = null;
    this.fire(false);
  }

  /* ── pub/sub ── */

  onMessage(handler: OnMessage): () => void {
    this.msgHandlers.push(handler);
    return () => {
      this.msgHandlers = this.msgHandlers.filter((h) => h !== handler);
    };
  }

  onStatus(handler: OnStatus): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /* ── internal ── */

  private reconnect(): void {
    if (this.attempts > 40) return;
    const delay = Math.min(1000 * 1.5 ** this.attempts, 30_000);
    this.timer = setTimeout(() => {
      this.attempts++;
      this.connect();
    }, delay);
  }

  private fire(ok: boolean): void {
    this.statusHandlers.forEach((h) => h(ok));
  }
}

// Singleton
let _ws: DevSwarmWS | null = null;
export function getWS(): DevSwarmWS {
  if (!_ws) _ws = new DevSwarmWS();
  return _ws;
}
