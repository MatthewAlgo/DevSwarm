/* ━━━━━━━━━━━━━━━━━━━
   DevSwarm — REST client
   ━━━━━━━━━━━━━━━━━━━ */

const GO = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
const PY = "http://localhost:8000";

async function get<T>(base: string, path: string): Promise<T> {
  const r = await fetch(`${base}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function post<T>(base: string, path: string, body: unknown): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function patch<T>(
  base: string,
  path: string,
  body: unknown,
): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const api = {
  // Go backend
  getAgents: () => get<any[]>(GO, "/agents"),
  getAgent: (id: string) => get<any>(GO, `/agents/${id}`),
  updateAgent: (id: string, d: any) => patch<any>(GO, `/agents/${id}`, d),
  getTasks: (agent?: string) =>
    get<any[]>(GO, `/tasks${agent ? `?agent_id=${agent}` : ""}`),
  createTask: (d: any) => post<{ id: string }>(GO, "/tasks", d),
  updateTaskStatus: (id: string, s: string) =>
    patch<any>(GO, `/tasks/${id}/status`, { status: s }),
  getMessages: (n = 50) => get<any[]>(GO, `/messages?limit=${n}`),
  sendMessage: (d: any) => post<{ id: string }>(GO, "/messages", d),
  getState: () => get<any>(GO, "/state"),
  overrideState: (d: any) => post<any>(GO, "/state/override", d),
  getCosts: () => get<any[]>(GO, "/costs"),
  getActivity: (n = 50) => get<any[]>(GO, `/activity?limit=${n}`),

  // Python AI engine
  triggerGoal: (goal: string, to?: string[]) =>
    post<any>(PY, "/api/trigger", { goal, assigned_to: to }),
  simulateActivity: () => post<any>(PY, "/api/simulate/activity", {}),
  simulateDemoDay: () => post<any>(PY, "/api/simulate/demo-day", {}),
};
/* eslint-enable @typescript-eslint/no-explicit-any */
