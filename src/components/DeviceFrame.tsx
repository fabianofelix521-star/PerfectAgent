/**
 * Device Frames — CSS-only iPhone 17, iPad, and Laptop frames
 * for the Code Studio preview panel.
 */
import { type ReactNode, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/utils/cn";

export type DeviceType = "iphone17" | "iphone17max" | "ipad" | "laptop";

export const DEVICES: Record<DeviceType, { label: string; width: number; height: number; icon: string }> = {
  iphone17: { label: "iPhone 17", width: 393, height: 852, icon: "📱" },
  iphone17max: { label: "iPhone 17 Pro Max", width: 430, height: 932, icon: "📱" },
  ipad: { label: "iPad Pro", width: 820, height: 1180, icon: "📱" },
  laptop: { label: "Laptop", width: 1280, height: 800, icon: "💻" },
};

interface DeviceFrameProps {
  device: DeviceType;
  children: ReactNode;
  className?: string;
}

export function DeviceFrame({ device, children, className }: DeviceFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const recalc = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const spec = DEVICES[device];
    if (device === "laptop") {
      setScale(1);
      return;
    }
    const s = Math.min(
      rect.width / spec.width,
      rect.height / spec.height,
    ) * 0.95;
    setScale(Math.min(s, 1));
  }, [device]);

  useEffect(() => {
    recalc();
    const obs = new ResizeObserver(recalc);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [recalc]);

  if (device === "laptop") {
    return (
      <div ref={containerRef} className={cn("h-full w-full", className)}>
        {children}
      </div>
    );
  }

  const isIPhone = device === "iphone17" || device === "iphone17max";
  const spec = DEVICES[device];

  return (
    <div
      ref={containerRef}
      className={cn("flex items-start justify-center overflow-hidden", className)}
    >
      <div
        style={{
          width: spec.width,
          height: spec.height,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {isIPhone ? (
          <IPhoneShell width={spec.width} height={spec.height}>
            {children}
          </IPhoneShell>
        ) : (
          <IPadShell width={spec.width} height={spec.height}>
            {children}
          </IPadShell>
        )}
      </div>
    </div>
  );
}

/* ---- iPhone 17 Shell ---- */

function IPhoneShell({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const bezel = 12;
  const radius = 55;
  const islandW = 126;
  const islandH = 37;
  const homeW = 134;
  const homeH = 5;

  return (
    <div
      className="relative"
      style={{
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(145deg, #2a2a2e 0%, #1a1a1e 50%, #0a0a0e 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 2px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.35)",
        padding: bezel,
      }}
    >
      {/* Dynamic Island */}
      <div
        className="absolute left-1/2 z-10"
        style={{
          top: bezel + 12,
          width: islandW,
          height: islandH,
          marginLeft: -islandW / 2,
          borderRadius: 20,
          background: "#000",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.05)",
        }}
      />
      {/* Screen */}
      <div
        className="overflow-hidden bg-black"
        style={{
          width: width - bezel * 2,
          height: height - bezel * 2,
          borderRadius: radius - bezel,
        }}
      >
        {children}
      </div>
      {/* Home Indicator */}
      <div
        className="absolute left-1/2"
        style={{
          bottom: bezel + 8,
          width: homeW,
          height: homeH,
          marginLeft: -homeW / 2,
          borderRadius: 3,
          background: "rgba(255,255,255,0.25)",
        }}
      />
    </div>
  );
}

/* ---- iPad Shell ---- */

function IPadShell({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const bezel = 16;
  const radius = 18;

  return (
    <div
      className="relative"
      style={{
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(145deg, #2a2a2e 0%, #1a1a1e 50%, #0a0a0e 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 2px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.35)",
        padding: bezel,
      }}
    >
      {/* Screen */}
      <div
        className="overflow-hidden bg-black"
        style={{
          width: width - bezel * 2,
          height: height - bezel * 2,
          borderRadius: radius - bezel / 2,
        }}
      >
        {children}
      </div>
      {/* Home Indicator */}
      <div
        className="absolute left-1/2"
        style={{
          bottom: bezel + 6,
          width: 100,
          height: 4,
          marginLeft: -50,
          borderRadius: 2,
          background: "rgba(255,255,255,0.2)",
        }}
      />
    </div>
  );
}
