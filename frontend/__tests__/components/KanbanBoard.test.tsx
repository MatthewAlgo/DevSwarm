/**
 * Tests for components/KanbanBoard.tsx — task columns, cards, empty state.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import KanbanBoard from "@/components/KanbanBoard";
import { useStore } from "@/lib/store";
import {
    ALL_AGENTS,
    ALL_TASKS,
    TASK_BACKLOG,
    TASK_IN_PROGRESS,
} from "../helpers/fixtures";

beforeEach(() => {
    useStore.setState({
        agents: ALL_AGENTS,
        tasks: ALL_TASKS,
    });
});

describe("KanbanBoard", () => {
    it("renders all 4 columns", () => {
        render(<KanbanBoard />);
        expect(screen.getByText("Backlog")).toBeInTheDocument();
        expect(screen.getByText("In Progress")).toBeInTheDocument();
        expect(screen.getByText("Review")).toBeInTheDocument();
        expect(screen.getByText("Done")).toBeInTheDocument();
    });

    it("shows total task count", () => {
        render(<KanbanBoard />);
        expect(screen.getByText("3 tasks")).toBeInTheDocument();
    });

    it("renders task titles", () => {
        render(<KanbanBoard />);
        expect(
            screen.getByText("Research AI frameworks"),
        ).toBeInTheDocument();
        expect(
            screen.getByText("Deploy monitoring stack"),
        ).toBeInTheDocument();
    });

    it("renders task descriptions when present", () => {
        render(<KanbanBoard />);
        expect(
            screen.getByText("Deep dive into LangGraph vs CrewAI"),
        ).toBeInTheDocument();
    });

    it("shows priority badge for high-priority tasks", () => {
        render(<KanbanBoard />);
        expect(screen.getByText("P5")).toBeInTheDocument(); // TASK_IN_PROGRESS
        expect(screen.getByText("P3")).toBeInTheDocument(); // TASK_BACKLOG
    });

    it("shows empty state when no tasks", () => {
        useStore.setState({ tasks: [] });
        render(<KanbanBoard />);
        expect(screen.getByText("No tasks yet")).toBeInTheDocument();
        expect(
            screen.getByText("Tasks appear when agents start working"),
        ).toBeInTheDocument();
    });

    it("renders Task Board heading", () => {
        render(<KanbanBoard />);
        expect(screen.getByText("Task Board")).toBeInTheDocument();
    });

    it("shows column item counts", () => {
        render(<KanbanBoard />);
        // Backlog=1, In Progress=1, Done=1, Review=0
        const counts = screen.getAllByText("1");
        expect(counts.length).toBeGreaterThanOrEqual(3);
    });
});
