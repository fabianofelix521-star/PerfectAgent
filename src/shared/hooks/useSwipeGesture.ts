import { useCallback, useRef } from "react";

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  maxVertical?: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  maxVertical = 80,
}: SwipeOptions) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    startX.current = event.touches[0]?.clientX ?? null;
    startY.current = event.touches[0]?.clientY ?? null;
    isSwiping.current = false;
  }, []);

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (startX.current === null || startY.current === null) return;

      const dx = (event.touches[0]?.clientX ?? startX.current) - startX.current;
      const dy = Math.abs(
        (event.touches[0]?.clientY ?? startY.current) - startY.current,
      );

      if (dy > maxVertical && !isSwiping.current) {
        startX.current = null;
        startY.current = null;
        return;
      }

      if (Math.abs(dx) > 10) {
        isSwiping.current = true;
      }
    },
    [maxVertical],
  );

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (startX.current === null || !isSwiping.current) return;

      const endX = event.changedTouches[0]?.clientX ?? startX.current;
      const dx = endX - startX.current;

      if (dx < -threshold) {
        onSwipeLeft?.();
      } else if (dx > threshold) {
        onSwipeRight?.();
      }

      startX.current = null;
      startY.current = null;
      isSwiping.current = false;
    },
    [onSwipeLeft, onSwipeRight, threshold],
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
}
