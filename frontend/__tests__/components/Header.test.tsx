/**
 * Tests for components/Header.tsx — breadcrumb, WS status, god mode toggle.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";

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
        connected: true,
        godMode: false,
        version: 5,
    });
});

describe("Header", () => {
    it("renders breadcrumb from root path", () => {
        render(<Header />);
        expect(screen.getByText("Floor Plan")).toBeInTheDocument();
    });

    it("shows Live status when connected", () => {
        render(<Header />);
        expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("shows Offline when disconnected", () => {
        useStore.setState({ connected: false });
        render(<Header />);
        expect(screen.getByText("Offline")).toBeInTheDocument();
    });

    it("shows Reconnecting text when disconnected", () => {
        useStore.setState({ connected: false });
        render(<Header />);
        expect(screen.getByText("Reconnecting…")).toBeInTheDocument();
    });

    it("shows version number", () => {
        render(<Header />);
        expect(screen.getByText("v5")).toBeInTheDocument();
    });

    it("renders God Mode toggle button", () => {
        render(<Header />);
        expect(screen.getByText("⚡ God Mode")).toBeInTheDocument();
    });

    it("toggles God Mode on click", async () => {
        const user = userEvent.setup();
        render(<Header />);
        await user.click(screen.getByText("⚡ God Mode"));
        expect(useStore.getState().godMode).toBe(true);
    });

    it("shows active God Mode state", () => {
        useStore.setState({ godMode: true });
        render(<Header />);
        expect(screen.getByText("✦ God Mode")).toBeInTheDocument();
    });

    it("shows user avatar initial", () => {
        render(<Header />);
        expect(screen.getByText("A")).toBeInTheDocument(); // "Admin"[0]
    });
});
