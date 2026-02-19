import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { normalizeAgent, normalizeTask, normalizeMessage } from "@/lib/types";
import { type Agent } from "@/lib/types";

/**
 * Hook to fetch initial data (agents, tasks, messages, costs) from the REST API.
 */
export function useInitialData() {
  const { setAgents, setTasks, setMessages, setCosts } = useStore();

  useEffect(() => {
    (async () => {
      try {
        const [a, t, m, c] = await Promise.all([
          api.getAgents().catch(() => []),
          api.getTasks().catch(() => []),
          api.getMessages().catch(() => []),
          api.getCosts().catch(() => []),
        ]);

        const aMap = (a || []).reduce<Record<string, Agent>>((acc, curr) => {
          const normalized = normalizeAgent(curr);
          if (!normalized.id) return acc;
          acc[normalized.id] = normalized;
          return acc;
        }, {});

        setAgents(aMap);
        setTasks(t.map(normalizeTask));
        setMessages(m.map(normalizeMessage));
        setCosts(c);
      } catch {
        /* backend may not be up yet */
      }
    })();
  }, [setAgents, setTasks, setMessages, setCosts]);
}
