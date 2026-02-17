"use client";

import { type ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useInitialData } from "@/hooks/useInitialData";

/**
 * Shared WebSocket + REST data bootstrap.
 * Mounted once in the (dashboard) layout so all pages share the connection.
 */
export default function WSProvider({ children }: { children: ReactNode }) {
    useWebSocket();
    useInitialData();

    return <>{children}</>;
}
