import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/utils/cn";

export interface SplitPaneProps {
  storageKey: string;
  /** Default left pane fraction (0..1). Defaults to 0.4 (40% chat / 60% preview). */
  defaultRatio?: number;
  /** Min/max left fraction. */
  minRatio?: number;
  maxRatio?: number;
  minLeftPx?: number;
  minRightPx?: number;
  left: ReactNode;
  right: ReactNode;
  className?: string;
}

/**
 * Horizontal draggable split pane with localStorage persistence.
 *
 * Used in Code Studio so the chat panel doesn't dominate the layout — the
 * preview gets the larger share by default.
 */
export function SplitPane({
  storageKey,
  defaultRatio = 0.4,
  minRatio = 0.25,
  maxRatio = 0.65,
  minLeftPx = 320,
  minRightPx = 420,
  left,
  right,
  className,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [ratio, setRatio] = useState<number>(() => {
    if (typeof localStorage === "undefined") return defaultRatio;
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? Number.parseFloat(raw) : NaN;
    if (Number.isFinite(parsed) && parsed >= minRatio && parsed <= maxRatio)
      return parsed;
    return defaultRatio;
  });

  useEffect(() => {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(storageKey, String(ratio));
  }, [ratio, storageKey]);

  const onMove = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pixelMinRatio = minLeftPx / rect.width;
      const pixelMaxRatio = 1 - minRightPx / rect.width;
      const lower = Math.max(minRatio, Math.min(pixelMinRatio, 0.75));
      const upper = Math.min(maxRatio, Math.max(pixelMaxRatio, lower));
      const next = (clientX - rect.left) / rect.width;
      setRatio(Math.min(upper, Math.max(lower, next)));
    },
    [maxRatio, minLeftPx, minRatio, minRightPx],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    const lower = Math.max(minRatio, Math.min(minLeftPx / rect.width, 0.75));
    const upper = Math.min(
      maxRatio,
      Math.max(1 - minRightPx / rect.width, lower),
    );
    setRatio((value) => Math.min(upper, Math.max(lower, value)));
  }, [maxRatio, minLeftPx, minRatio, minRightPx]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (draggingRef.current) onMove(e.clientX);
    }
    function onTouchMove(e: TouchEvent) {
      if (draggingRef.current && e.touches[0]) onMove(e.touches[0].clientX);
    }
    function onUp() {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [onMove]);

  function startDrag() {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-full min-h-0 w-full overflow-hidden gap-0",
        className,
      )}
    >
      <div
        style={{ flex: `0 1 ${ratio * 100}%`, minWidth: minLeftPx }}
        className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      >
        {left}
      </div>
      <button
        type="button"
        aria-label="Resize panels"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onDoubleClick={() => setRatio(defaultRatio)}
        className="relative z-10 mx-1 w-1.5 shrink-0 cursor-col-resize rounded-full bg-slate-300/60 transition hover:bg-indigo-400/70"
      >
        <span className="sr-only">Drag to resize</span>
      </button>
      <div
        style={{ flex: `1 1 ${(1 - ratio) * 100}%`, minWidth: minRightPx }}
        className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      >
        {right}
      </div>
    </div>
  );
}
