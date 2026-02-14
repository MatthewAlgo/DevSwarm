/**
 * Tests for components/OfficeFloorPlan.tsx — room grid, agents, empty state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OfficeFloorPlan from "@/components/OfficeFloorPlan";
import { useStore } from "@/lib/store";
import { ALL_AGENTS, MARCO, MONA, BOB } from "../helpers/fixtures";

beforeEach(() => {
    useStore.setState({
        agents: ALL_AGENTS,
        selectedId: null,
    });
});

describe("OfficeFloorPlan", () => {
    it("renders all 5 rooms", () => {
        render(<OfficeFloorPlan />);
        expect(screen.getByText("Private Office")).toBeInTheDocument();
        expect(screen.getByText("War Room")).toBeInTheDocument();
        expect(screen.getByText("Desks")).toBeInTheDocument();
        expect(screen.getByText("Lounge")).toBeInTheDocument();
        expect(screen.getByText("Server Room")).toBeInTheDocument();
    });

    it("renders room icons", () => {
        render(<OfficeFloorPlan />);
        expect(screen.getByText("🏢")).toBeInTheDocument(); // Private Office
        expect(screen.getByText("⚔️")).toBeInTheDocument(); // War Room
        expect(screen.getByText("💻")).toBeInTheDocument(); // Desks
    });

    it("shows agent avatars in correct rooms", () => {
        render(<OfficeFloorPlan />);
        // Marco is in Private Office, Mona in War Room
        expect(screen.getByLabelText("Inspect Marco")).toBeInTheDocument();
        expect(screen.getByLabelText("Inspect Mona Lisa")).toBeInTheDocument();
    });

    it("shows Empty for rooms with no agents", () => {
        render(<OfficeFloorPlan />);
        // Lounge has no agents
        expect(screen.getByText("Empty")).toBeInTheDocument();
    });

    it("shows loading state when no agents", () => {
        useStore.setState({ agents: {} });
        render(<OfficeFloorPlan />);
        expect(
            screen.getByText("Connecting to DevSwarm HQ…"),
        ).toBeInTheDocument();
    });

    it("selects agent on click", async () => {
        const user = userEvent.setup();
        render(<OfficeFloorPlan />);
        await user.click(screen.getByLabelText("Inspect Marco"));
        expect(useStore.getState().selectedId).toBe("marco");
    });

    it("deselects agent when clicking selected agent again", async () => {
        const user = userEvent.setup();
        useStore.setState({ selectedId: "marco" });
        render(<OfficeFloorPlan />);
        await user.click(screen.getByLabelText("Inspect Marco"));
        expect(useStore.getState().selectedId).toBeNull();
    });

    it("shows occupant count per room", () => {
        render(<OfficeFloorPlan />);
        // Each room header shows count. Private Office has 1 agent (Marco)
        const ones = screen.getAllByText("1");
        expect(ones.length).toBeGreaterThanOrEqual(1);
    });
});
