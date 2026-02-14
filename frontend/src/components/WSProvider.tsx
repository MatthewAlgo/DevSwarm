"use client";

import { useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { getWS } from "@/lib/websocket";
import { api } from "@/lib/api";
import { normalizeTask, normalizeMessage, normalizeAgent } from "@/lib/types";

/**
 * Shared WebSocket + REST data bootstrap.
 * Mounted once in the (dashboard) layout so all pages share the connection.
 */
export default function WSProvider({ children }: { children: ReactNode }) {
    const { applyWSPayload, setConnected, setAgents, setTasks, setMessages, setCosts } =
        useStore();

    /* ── WebSocket ── */
    useEffect(() => {
        const ws = getWS();
        const offMsg = ws.onMessage((d) =>
            applyWSPayload(d as Record<string, unknown>),
        );
        const offStatus = ws.onStatus((ok) => setConnected(ok));
        ws.connect();
        return () => {
            offMsg();
            offStatus();
            ws.disconnect();
        };
    }, [applyWSPayload, setConnected]);

    /* ── Initial REST fetch ── */
    useEffect(() => {
        (async () => {
            try {
                const [a, t, m, c] = await Promise.all([
                    api.getAgents().catch(() => []),
                    api.getTasks().catch(() => []),
                    api.getMessages().catch(() => []),
                    api.getCosts().catch(() => []),
                ]);
                const aMap = (a || []).reduce((acc: any, curr: any) => {
                    acc[curr.id] = normalizeAgent(curr);
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
    }, [setTasks, setMessages, setCosts]);

    return <>{children}</>;
}
