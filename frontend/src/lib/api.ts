/* ━━━━━━━━━━━━━━━━━━━
   DevSwarm — REST client
   ━━━━━━━━━━━━━━━━━━━ */

function resolveApiBaseCandidates(): string[] {
  const candidates: string[] = [];

  // Prefer same-origin API first so Next.js rewrites can handle routing
  // without cross-origin CORS preflight/response constraints.
  candidates.push("/api");

  if (process.env.NEXT_PUBLIC_API_URL) {
    candidates.push(process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, ""));
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin.startsWith("http://") || origin.startsWith("https://")) {
      candidates.push(`${origin}/api`);
    }
  }

  candidates.push("http://localhost:8080/api");
  candidates.push("http://127.0.0.1:8080/api");

  // Preserve order, remove duplicates
  return Array.from(new Set(candidates));
}

async function fetchWithFallback(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const bases = resolveApiBaseCandidates();
  let lastError: unknown = null;
  let lastFallbackResponse: Response | null = null;
  const originApi =
    typeof window !== "undefined" ? `${window.location.origin}/api` : "";

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, init);
      const isGatewayCandidate = base === "/api" || base === originApi;

      // Try next candidate when this base clearly does not expose the API.
      if (response.status === 404 || response.status === 405) {
        lastFallbackResponse = response;
        continue;
      }
      // When a local gateway/proxy base returns 5xx, try direct backend candidates.
      if (
        isGatewayCandidate &&
        response.status >= 500 &&
        response.status <= 504
      ) {
        lastFallbackResponse = response;
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastFallbackResponse) return lastFallbackResponse;

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch API endpoint: ${path}`);
}

const TOKEN = "Bearer devswarm-secret-key";

async function get<T>(path: string): Promise<T> {
  const r = await fetchWithFallback(path, {
    headers: { Authorization: TOKEN },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetchWithFallback(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: TOKEN,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function patch<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const r = await fetchWithFallback(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: TOKEN,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const api = {
  // Go backend
  getAgents: () => get<any[]>("/agents"),
  getAgent: (id: string) => get<any>(`/agents/${id}`),
  updateAgent: (id: string, d: any) => patch<any>(`/agents/${id}`, d),
  getTasks: (agent?: string) =>
    get<any[]>(`/tasks${agent ? `?agent_id=${agent}` : ""}`),
  createTask: (d: any) => post<{ id: string }>("/tasks", d),
  updateTaskStatus: (id: string, s: string) =>
    patch<any>(`/tasks/${id}/status`, { status: s }),
  getMessages: (n = 50, agentId?: string) =>
    get<any[]>(
      `/messages?limit=${n}${agentId ? `&agent_id=${encodeURIComponent(agentId)}` : ""}`,
    ),
  sendMessage: (d: any) => post<{ id: string }>("/messages", d),
  getState: () => get<any>("/state"),
  overrideState: (d: any) => post<any>("/state/override", d),
  getCosts: () => get<any[]>("/costs"),
  getActivity: (n = 50) => get<any[]>(`/activity?limit=${n}`),

  // Python AI engine (proxied via Go)
  triggerGoal: (goal: string, to?: string[]) =>
    post<any>("/trigger", { goal, assignedTo: to }),
  simulateActivity: () => post<any>("/simulate/activity", {}),
  simulateDemoDay: () => post<any>("/simulate/demo-day", {}),
};
/* eslint-enable @typescript-eslint/no-explicit-any */
