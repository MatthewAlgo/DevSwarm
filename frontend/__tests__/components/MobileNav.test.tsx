/**
 * Tests for components/MobileNav.tsx — tab bar rendering, active state.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MobileNav from "@/components/MobileNav";

describe("MobileNav", () => {
    it("renders all 5 tabs", () => {
        render(<MobileNav />);
        expect(screen.getByText("Floor")).toBeInTheDocument();
        expect(screen.getByText("Kanban")).toBeInTheDocument();
        expect(screen.getByText("Agents")).toBeInTheDocument();
        expect(screen.getByText("Activity")).toBeInTheDocument();
        expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders tab icons", () => {
        render(<MobileNav />);
        expect(screen.getByText("🏢")).toBeInTheDocument();
        expect(screen.getByText("📋")).toBeInTheDocument();
        expect(screen.getByText("🤖")).toBeInTheDocument();
        expect(screen.getByText("📡")).toBeInTheDocument();
        expect(screen.getByText("⚙️")).toBeInTheDocument();
    });

    it("has correct number of nav links", () => {
        render(<MobileNav />);
        const links = screen.getAllByRole("link");
        expect(links).toHaveLength(5);
    });

    it("has correct hrefs", () => {
        render(<MobileNav />);
        const links = screen.getAllByRole("link");
        const hrefs = links.map((l) => l.getAttribute("href"));
        expect(hrefs).toContain("/");
        expect(hrefs).toContain("/kanban");
        expect(hrefs).toContain("/agents");
        expect(hrefs).toContain("/activity");
        expect(hrefs).toContain("/settings");
    });

    it("renders as nav element", () => {
        render(<MobileNav />);
        expect(screen.getByRole("navigation")).toBeInTheDocument();
    });
});
