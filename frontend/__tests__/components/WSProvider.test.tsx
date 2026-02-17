/**
 * Tests for components/WSProvider.tsx — WS connection + REST bootstrap.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import WSProvider from "@/components/WSProvider";
import { useStore } from "@/lib/store";

/* ── Mock websocket module ── */
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockOnMessage = vi.fn(() => vi.fn());
const mockOnStatus = vi.fn(() => vi.fn());

vi.mock("@/lib/websocket", () => ({
    getWS: () => ({
        connect: mockConnect,
        disconnect: mockDisconnect,
        onMessage: mockOnMessage,
        onStatus: mockOnStatus,
    }),
}));

/* ── Mock api module ── */
const mockGetAgents = vi.fn().mockResolvedValue([
    { id: "marco", name: "Marco", role: "CEO" },
]);
const mockGetTasks = vi.fn().mockResolvedValue([
    { id: "t1", title: "Task", status: "Backlog" },
]);
const mockGetMessages = vi.fn().mockResolvedValue([
    { id: "m1", from_agent: "marco", content: "Hello" },
]);
const mockGetCosts = vi.fn().mockResolvedValue([
    { agentId: "marco", totalCost: 0.01 },
]);

vi.mock("@/lib/api", () => ({
    api: {
        getAgents: () => mockGetAgents(),
        getTasks: () => mockGetTasks(),
        getMessages: () => mockGetMessages(),
        getCosts: () => mockGetCosts(),
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
        agents: {},
        tasks: [],
        messages: [],
        costs: [],
        connected: false,
    });
});

describe("WSProvider", () => {
    it("renders children", () => {
        const { getByText } = render(
            <WSProvider>
                <span>dashboard-content</span>
            </WSProvider>,
        );
        expect(getByText("dashboard-content")).toBeInTheDocument();
    });

    it("connects WebSocket on mount", () => {
        render(<WSProvider><div /></WSProvider>);
        expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("subscribes to onMessage and onStatus", () => {
        render(<WSProvider><div /></WSProvider>);
        expect(mockOnMessage).toHaveBeenCalledTimes(1);
        expect(mockOnStatus).toHaveBeenCalledTimes(1);
    });

    it("fetches initial data from REST on mount", async () => {
        render(<WSProvider><div /></WSProvider>);
        await waitFor(() => {
            expect(mockGetAgents).toHaveBeenCalled();
            expect(mockGetTasks).toHaveBeenCalled();
            expect(mockGetMessages).toHaveBeenCalled();
            expect(mockGetCosts).toHaveBeenCalled();
        });
    });

    it("populates store with fetched agents", async () => {
        render(<WSProvider><div /></WSProvider>);
        await waitFor(() => {
            expect(Object.keys(useStore.getState().agents).length).toBe(1);
            expect(useStore.getState().agents["marco"].name).toBe("Marco");
        });
    });

    it("populates store with fetched tasks", async () => {
        render(<WSProvider><div /></WSProvider>);
        await waitFor(() => {
            expect(useStore.getState().tasks.length).toBe(1);
        });
    });

    it("populates store with fetched messages", async () => {
        render(<WSProvider><div /></WSProvider>);
        await waitFor(() => {
            expect(useStore.getState().messages.length).toBe(1);
        });
    });

    it("populates store with fetched costs", async () => {
        render(<WSProvider><div /></WSProvider>);
        await waitFor(() => {
            expect(useStore.getState().costs.length).toBe(1);
        });
    });

    it("handles REST fetch failures gracefully", async () => {
        mockGetTasks.mockRejectedValueOnce(new Error("Network error"));
        mockGetMessages.mockRejectedValueOnce(new Error("Network error"));
        mockGetCosts.mockRejectedValueOnce(new Error("Network error"));

        // Should not throw
        const { getByText } = render(
            <WSProvider>
                <span>still-renders</span>
            </WSProvider>,
        );
        await waitFor(() => {
            expect(getByText("still-renders")).toBeInTheDocument();
        });
    });

    it("disconnects WebSocket on unmount", () => {
        const { unmount } = render(<WSProvider><div /></WSProvider>);
        unmount();
        expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
});
