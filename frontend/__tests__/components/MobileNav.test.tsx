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
        expect(screen.getByText("Board")).toBeInTheDocument();
        expect(screen.getByText("Swarm")).toBeInTheDocument();
        expect(screen.getByText("Neural")).toBeInTheDocument();
        expect(screen.getByText("Config")).toBeInTheDocument();
    });

    it("renders tab icons (replaced with lucide svg verification)", () => {
        const { container } = render(<MobileNav />);
        const svgs = container.querySelectorAll("svg");
        expect(svgs.length).toBe(5);
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
