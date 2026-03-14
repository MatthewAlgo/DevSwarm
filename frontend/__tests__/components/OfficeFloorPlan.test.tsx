/**
 * Tests for components/OfficeFloorPlan.tsx — room grid, agents, empty state.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OfficeFloorPlan from "@/components/OfficeFloorPlan";
import { useStore } from "@/lib/store";
import { ALL_AGENTS, RESEARCHER } from "../helpers/fixtures";

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

    it("renders room icons (lucide svgs)", () => {
        const { container } = render(<OfficeFloorPlan />);
        const svgs = container.querySelectorAll("svg");
        expect(svgs.length).toBeGreaterThan(0);
    });

    it("shows agent avatars in correct rooms", () => {
        render(<OfficeFloorPlan />);
        // Orchestrator is in Private Office, Researcher in War Room
        expect(screen.getByLabelText("Inspect Orchestrator")).toBeInTheDocument();
        expect(screen.getByLabelText("Inspect Researcher")).toBeInTheDocument();
    });

    it("shows Empty for rooms with no agents", () => {
        render(<OfficeFloorPlan />);
        // Lounge has no agents
        expect(screen.getByText("Empty Sector")).toBeInTheDocument();
    });

    it("shows loading state when no agents", () => {
        useStore.setState({ agents: {} });
        render(<OfficeFloorPlan />);
        expect(
            screen.getByText("Establishing Neural Link"),
        ).toBeInTheDocument();
    });

    it("selects agent on click", async () => {
        const user = userEvent.setup();
        render(<OfficeFloorPlan />);
        await user.click(screen.getByLabelText("Inspect Orchestrator"));
        expect(useStore.getState().selectedId).toBe("orchestrator");
    });

    it("switches selected agent directly without intermediate close", async () => {
        const user = userEvent.setup();
        useStore.setState({ selectedId: "orchestrator" });
        render(<OfficeFloorPlan />);
        await user.click(screen.getByLabelText("Inspect Researcher"));
        expect(useStore.getState().selectedId).toBe("researcher");
    });

    it("selects by canonical store key even when agent.id is stale", async () => {
        const user = userEvent.setup();
        useStore.setState({
            agents: {
                ...ALL_AGENTS,
                researcher: {
                    ...RESEARCHER,
                    id: "stale-id",
                },
            },
            selectedId: "orchestrator",
        });
        render(<OfficeFloorPlan />);
        await user.click(screen.getByLabelText("Inspect Researcher"));
        expect(useStore.getState().selectedId).toBe("researcher");
    });

    it("shows occupant count per room", () => {
        render(<OfficeFloorPlan />);
        // Each room header shows count. Private Office has 1 agent (Orchestrator)
        const ones = screen.getAllByText("1");
        expect(ones.length).toBeGreaterThanOrEqual(1);
    });
});
