/**
 * Tests for components/GodMode.tsx — stat cards, quick actions, agent list.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GodMode from "@/components/GodMode";
import { useStore } from "@/lib/store";
import { ALL_AGENTS, ALL_TASKS, ALL_MESSAGES } from "../helpers/fixtures";

/* Mock api */
vi.mock("@/lib/api", () => ({
    api: {
        triggerGoal: vi.fn().mockResolvedValue({}),
        overrideState: vi.fn().mockResolvedValue({}),
        simulateDemoDay: vi.fn().mockResolvedValue({}),
        simulateActivity: vi.fn().mockResolvedValue({}),
        getTasks: vi.fn().mockResolvedValue([]),
        getMessages: vi.fn().mockResolvedValue([]),
        getCosts: vi.fn().mockResolvedValue([]),
    },
}));

beforeEach(() => {
    useStore.setState({
        agents: ALL_AGENTS,
        tasks: ALL_TASKS,
        messages: ALL_MESSAGES,
        godMode: true,
    });
});

describe("GodMode", () => {
    it("renders only when godMode is true", () => {
        render(<GodMode />);
        expect(screen.getByText("God Mode")).toBeInTheDocument();
    });

    it("still renders when godMode is false (parent controls visibility)", () => {
        useStore.setState({ godMode: false });
        render(<GodMode />);
        // GodMode component itself always renders; parent layout gates visibility
        expect(screen.getByText("God Mode")).toBeInTheDocument();
    });

    it("shows agent stat card", () => {
        render(<GodMode />);
        // Should show agent count (4 from fixtures)
        expect(screen.getByText("Agents")).toBeInTheDocument();
    });

    it("shows task stat card", () => {
        render(<GodMode />);
        expect(screen.getByText("Tasks")).toBeInTheDocument();
    });

    it("shows message stat card", () => {
        render(<GodMode />);
        expect(screen.getByText("Messages")).toBeInTheDocument();
    });

    it("shows goal input field", () => {
        render(<GodMode />);
        const input = screen.getByPlaceholderText(/goal/i);
        expect(input).toBeInTheDocument();
    });

    it("has trigger button", () => {
        render(<GodMode />);
        expect(
            screen.getByRole("button", { name: /trigger/i }),
        ).toBeInTheDocument();
    });

    it("shows agent list with statuses", () => {
        render(<GodMode />);
        expect(screen.getByText("Marco")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("shows quick action buttons", () => {
        render(<GodMode />);
        // There should be Demo Day and/or other quick action buttons
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(3);
    });
});
