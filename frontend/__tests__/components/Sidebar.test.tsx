/**
 * Tests for components/Sidebar.tsx — nav links, active state, collapse, user info.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "@/components/Sidebar";
import { useStore } from "@/lib/store";
import { ALL_AGENTS } from "../helpers/fixtures";

/* Mock AuthProvider */
vi.mock("@/components/AuthProvider", () => ({
    useAuth: () => ({
        user: { name: "Admin", email: "admin@devswarm.io", role: "admin" as const },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
    }),
}));

beforeEach(() => {
    useStore.setState({
        agents: ALL_AGENTS,
        connected: true,
    });
});

describe("Sidebar", () => {
    it("renders all navigation links", () => {
        render(<Sidebar />);
        expect(screen.getByText("Floor Plan")).toBeInTheDocument();
        expect(screen.getByText("Kanban")).toBeInTheDocument();
        expect(screen.getByText("Agents")).toBeInTheDocument();
        expect(screen.getByText("Activity")).toBeInTheDocument();
        expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders DevSwarm brand", () => {
        render(<Sidebar />);
        expect(screen.getByText("DevSwarm")).toBeInTheDocument();
    });

    it("shows agent count badge", () => {
        render(<Sidebar />);
        // 4 agents from ALL_AGENTS
        expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("shows Live status when connected", () => {
        render(<Sidebar />);
        expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("shows Offline when disconnected", () => {
        useStore.setState({ connected: false });
        render(<Sidebar />);
        expect(screen.getByText("Offline")).toBeInTheDocument();
    });

    it("renders user name", () => {
        render(<Sidebar />);
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("renders user role", () => {
        render(<Sidebar />);
        expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("has collapse toggle button", () => {
        render(<Sidebar />);
        expect(screen.getByText("«")).toBeInTheDocument();
    });

    it("collapses on toggle click", async () => {
        const user = userEvent.setup();
        render(<Sidebar />);
        await user.click(screen.getByText("«"));
        // After collapse the toggle text changes
        expect(screen.getByText("»")).toBeInTheDocument();
        // DevSwarm brand should be hidden
        expect(screen.queryByText("DevSwarm")).not.toBeInTheDocument();
    });

    it("has correct nav hrefs", () => {
        render(<Sidebar />);
        const links = screen.getAllByRole("link");
        const hrefs = links.map((l) => l.getAttribute("href"));
        expect(hrefs).toContain("/");
        expect(hrefs).toContain("/kanban");
        expect(hrefs).toContain("/agents");
    });

    it("renders navigation icons", () => {
        render(<Sidebar />);
        expect(screen.getByText("🏢")).toBeInTheDocument();
        expect(screen.getByText("📋")).toBeInTheDocument();
        expect(screen.getByText("🤖")).toBeInTheDocument();
    });
});
