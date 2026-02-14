/**
 * Tests for components/AuthProvider.tsx — login, logout, hydration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthProvider, { useAuth } from "@/components/AuthProvider";

/* Clear localStorage before each test */
beforeEach(() => {
    localStorage.clear();
});

/* Helper to access hook values */
function AuthConsumer() {
    const { user, loading, login, logout } = useAuth();
    return (
        <div>
            <span data-testid="loading">{loading ? "true" : "false"}</span>
            <span data-testid="user">{user ? user.name : "null"}</span>
            <button onClick={() => login("admin@devswarm.io", "admin")}>
                Login
            </button>
            <button onClick={() => login("admin@devswarm.io", "wrong")}>
                LoginBad
            </button>
            <button onClick={logout}>Logout</button>
        </div>
    );
}

describe("AuthProvider", () => {
    it("starts with no user", async () => {
        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>,
        );
        await waitFor(() =>
            expect(screen.getByTestId("loading").textContent).toBe("false"),
        );
        expect(screen.getByTestId("user").textContent).toBe("null");
    });

    it("hydrates user from localStorage", async () => {
        localStorage.setItem(
            "devswarm_user",
            JSON.stringify({ email: "admin@devswarm.io", name: "Admin", role: "admin" }),
        );
        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>,
        );
        await waitFor(() =>
            expect(screen.getByTestId("user").textContent).toBe("Admin"),
        );
    });

    it("login with correct credentials sets user", async () => {
        const user = userEvent.setup();
        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>,
        );

        // Wait for initial hydration
        await waitFor(() =>
            expect(screen.getByTestId("loading").textContent).toBe("false"),
        );

        await user.click(screen.getByText("Login"));

        // The login has a 600ms simulated delay — wait up to 2s
        await waitFor(
            () => expect(screen.getByTestId("user").textContent).toBe("Admin"),
            { timeout: 2000 },
        );
        expect(localStorage.getItem("devswarm_user")).toContain("Admin");
    });

    it("login with wrong credentials does not set user", async () => {
        const user = userEvent.setup();
        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>,
        );

        await waitFor(() =>
            expect(screen.getByTestId("loading").textContent).toBe("false"),
        );

        await user.click(screen.getByText("LoginBad"));

        // Wait for the 600ms to elapse
        await new Promise((r) => setTimeout(r, 800));
        expect(screen.getByTestId("user").textContent).toBe("null");
    });

    it("logout clears user and storage", async () => {
        localStorage.setItem(
            "devswarm_user",
            JSON.stringify({ email: "admin@devswarm.io", name: "Admin", role: "admin" }),
        );
        const user = userEvent.setup();
        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>,
        );
        await waitFor(() =>
            expect(screen.getByTestId("user").textContent).toBe("Admin"),
        );

        await user.click(screen.getByText("Logout"));
        expect(screen.getByTestId("user").textContent).toBe("null");
        expect(localStorage.getItem("devswarm_user")).toBeNull();
    });

    it("renders children", () => {
        render(
            <AuthProvider>
                <span>child-content</span>
            </AuthProvider>,
        );
        expect(screen.getByText("child-content")).toBeInTheDocument();
    });
});
