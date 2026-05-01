import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export interface BreakpointState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

function readWindowWidth(): number {
  return typeof window !== "undefined" ? window.innerWidth : 1280;
}

function computeState(width: number): BreakpointState {
  const breakpoint: Breakpoint =
    width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";

  return {
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
    width,
  };
}

let listeners = new Set<(state: BreakpointState) => void>();
let currentState = computeState(readWindowWidth());
let resizeObserver: ResizeObserver | null = null;

function ensureObserver(): void {
  if (typeof window === "undefined" || resizeObserver) return;

  const update = () => {
    currentState = computeState(readWindowWidth());
    for (const listener of listeners) listener(currentState);
  };

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(document.documentElement);
    return;
  }

  window.addEventListener("resize", update, { passive: true });
}

ensureObserver();

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(currentState);

  useEffect(() => {
    setState(currentState);
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
