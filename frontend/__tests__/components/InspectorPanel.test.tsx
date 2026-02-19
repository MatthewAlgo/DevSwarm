/**
 * Tests for components/InspectorPanel.tsx — agent inspector panel.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { act } from "react";
import { render, screen } from "@testing-library/react";
import InspectorPanel from "@/components/InspectorPanel";
import { useStore } from "@/lib/store";
import { ALL_AGENTS, ALL_TASKS, ALL_MESSAGES, ORCHESTRATOR } from "../helpers/fixtures";

beforeEach(() => {
    useStore.setState({
        agents: ALL_AGENTS,
        tasks: ALL_TASKS,
        messages: ALL_MESSAGES,
        selectedId: "orchestrator",
    });
});

describe("InspectorPanel", () => {
    it("shows agent name when selected", () => {
        render(<InspectorPanel />);
        expect(screen.getByText("Orchestrator")).toBeInTheDocument();
    });

    it("shows agent role", () => {
        render(<InspectorPanel />);
        expect(screen.getByText("CEO & Orchestrator")).toBeInTheDocument();
    });

    it("shows agent status badge", () => {
        render(<InspectorPanel />);
        expect(screen.getByText("Working")).toBeInTheDocument();
    });

    it("shows room with icon", () => {
        render(<InspectorPanel />);
        expect(screen.getByText(/Private Office/)).toBeInTheDocument();
    });

    it("shows current task", () => {
        render(<InspectorPanel />);
        expect(screen.getByText("Coordinating sprint")).toBeInTheDocument();
    });

    it("shows thought chain", () => {
        render(<InspectorPanel />);
        expect(
            screen.getByText("Analyzing team capacity..."),
        ).toBeInTheDocument();
    });

    it("shows tech stack", () => {
        render(<InspectorPanel />);
        expect(screen.getByText("LangGraph")).toBeInTheDocument();
        expect(screen.getByText("MCP")).toBeInTheDocument();
    });

    it("shows placeholder when no agent selected", () => {
        useStore.setState({ selectedId: null });
        render(<InspectorPanel />);
        expect(
            screen.getByText(/Select an agent/i),
        ).toBeInTheDocument();
    });

    it("shows section headings", () => {
        render(<InspectorPanel />);
        expect(screen.getByText("Current Task")).toBeInTheDocument();
        expect(screen.getByText("Tech Stack")).toBeInTheDocument();
    });

    it("switches details when selected agent changes", () => {
        render(<InspectorPanel />);
        expect(screen.getByText("Orchestrator")).toBeInTheDocument();

        act(() => {
            useStore.setState({ selectedId: "researcher" });
        });

        expect(screen.getByText("Researcher")).toBeInTheDocument();
        expect(screen.queryByText("Orchestrator")).not.toBeInTheDocument();
    });
});
