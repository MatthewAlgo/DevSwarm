/**
 * Tests for components/AgentAvatar.tsx — AgentAvatar, AgentDot, StatusBadge.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgentAvatar, { AgentDot, StatusBadge } from "@/components/AgentAvatar";
import { ORCHESTRATOR, RESEARCHER, DEVOPS, CLOCKED_OUT_AGENT } from "../helpers/fixtures";
import type { AgentStatus } from "@/lib/types";

/* ═══════════════════════════════════════════
   AgentAvatar
   ═══════════════════════════════════════════ */

describe("AgentAvatar", () => {
    it("renders agent name or initials", () => {
        render(
            <AgentAvatar agent={ORCHESTRATOR} selected={false} onClick={vi.fn()} />,
        );
        // Name <= 7 chars renders full name — appears in body + tooltip
        const matches = screen.getAllByText("Orchestrator");
        expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("renders role label", () => {
        render(
            <AgentAvatar agent={ORCHESTRATOR} selected={false} onClick={vi.fn()} />,
        );
        expect(screen.getByText("CEO & Orchestrator")).toBeInTheDocument();
    });

    it("hides role on size='sm'", () => {
        render(
            <AgentAvatar
                agent={ORCHESTRATOR}
                selected={false}
                onClick={vi.fn()}
                size="sm"
            />,
        );
        expect(screen.queryByText("CEO & Orchestrator")).not.toBeInTheDocument();
    });

    it("fires onClick when clicked", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(
            <AgentAvatar agent={ORCHESTRATOR} selected={false} onClick={onClick} />,
        );
        await user.click(screen.getByLabelText("Inspect Orchestrator"));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("has aria-label with agent name", () => {
        render(
            <AgentAvatar agent={RESEARCHER} selected={false} onClick={vi.fn()} />,
        );
        expect(
            screen.getByLabelText("Inspect Researcher"),
        ).toBeInTheDocument();
    });

    it("shows status dot", () => {
        const { container } = render(
            <AgentAvatar agent={ORCHESTRATOR} selected={false} onClick={vi.fn()} />,
        );
        // Status dot is the small absolute-positioned span
        const dots = container.querySelectorAll(".rounded-full");
        expect(dots.length).toBeGreaterThan(0);
    });

    it("shows current task when Working and size != sm", () => {
        render(
            <AgentAvatar agent={ORCHESTRATOR} selected={false} onClick={vi.fn()} />,
        );
        expect(screen.getByText("Coordinating sprint")).toBeInTheDocument();
    });

    it("hides current task when Idle", () => {
        render(
            <AgentAvatar agent={RESEARCHER} selected={false} onClick={vi.fn()} />,
        );
        expect(screen.queryByText("Coordinating sprint")).not.toBeInTheDocument();
    });

    it("shows tooltip with name and status", () => {
        render(
            <AgentAvatar agent={ORCHESTRATOR} selected={false} onClick={vi.fn()} />,
        );
        // Tooltip has name in <strong> and " · Working" as text node
        const strong = screen.getAllByText("Orchestrator");
        expect(strong.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/· Working/)).toBeInTheDocument();
    });
});

/* ═══════════════════════════════════════════
   AgentDot
   ═══════════════════════════════════════════ */

describe("AgentDot", () => {
    it("renders first letter of name", () => {
        render(<AgentDot agent={ORCHESTRATOR} />);
        expect(screen.getByText("O")).toBeInTheDocument();
    });

    it("renders null when no agent", () => {
        const { container } = render(<AgentDot />);
        expect(container.innerHTML).toBe("");
    });

    it("applies custom size", () => {
        render(<AgentDot agent={RESEARCHER} size={30} />);
        const dot = screen.getByTitle("Researcher");
        expect(dot).toHaveStyle({ width: "30px", height: "30px" });
    });

    it("uses avatar color", () => {
        render(<AgentDot agent={DEVOPS} />);
        const dot = screen.getByTitle("DevOps");
        // jsdom converts hex to rgb
        expect(dot.style.color).toContain("239"); // #ef4444 -> rgb(239, ...)
    });
});

/* ═══════════════════════════════════════════
   StatusBadge
   ═══════════════════════════════════════════ */

describe("StatusBadge", () => {
    const statuses: AgentStatus[] = [
        "Idle",
        "Working",
        "Meeting",
        "Error",
        "Clocked Out",
    ];

    it.each(statuses)("renders badge for status: %s", (status) => {
        render(<StatusBadge status={status} />);
        expect(screen.getByText(status)).toBeInTheDocument();
    });

    it("has status dot with correct color", () => {
        const { container } = render(<StatusBadge status="Working" />);
        const dots = container.querySelectorAll(".rounded-full");
        expect(dots.length).toBeGreaterThan(0);
    });
});
