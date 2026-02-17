/**
 * Vitest global setup — extends expect with DOM matchers,
 * mocks browser APIs not available in jsdom.
 */
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/* ── Mock next/navigation ── */
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
}));

/* ── Mock next/link (render as <a>) ── */
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    return React.createElement("a", { ...props, href }, children);
  },
}));

/* ── Mock framer-motion (passthrough divs) ── */
vi.mock("framer-motion", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  const wrap = (tag: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Component = React.forwardRef((props: any, ref: any) => {
      const {
        animate,
        initial,
        exit,
        transition,
        whileHover,
        whileTap,
        layoutId,
        layout,
        variants,
        ...rest
      } = props;
      return React.createElement(tag, { ...rest, ref });
    });
    Component.displayName = `Motion.${tag}`;
    return Component;
  };

  return {
    motion: new Proxy(
      {},
      {
        get(_target, key: string) {
          return wrap(key);
        },
      },
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    LayoutGroup: ({ children }: { children: React.ReactNode }) => children,
  };
});


/* ── localStorage polyfill ── */
const store: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => Object.keys(store).forEach((k) => delete store[k]),
  },
});
