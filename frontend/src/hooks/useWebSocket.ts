import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { getWS } from "@/lib/websocket";

/**
 * Hook to manage WebSocket connection and message handling.
 */
export function useWebSocket() {
  const { applyWSPayload, setConnected } = useStore();

  useEffect(() => {
    const ws = getWS();
    const offMsg = ws.onMessage((d) =>
      applyWSPayload(d as Record<string, unknown>)
    );
    const offStatus = ws.onStatus((ok) => setConnected(ok));
    
    ws.connect();
    
    return () => {
      offMsg();
      offStatus();
      ws.disconnect();
    };
  }, [applyWSPayload, setConnected]);
}
