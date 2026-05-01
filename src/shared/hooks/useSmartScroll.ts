import { useCallback, useEffect, useRef } from "react";

interface UseSmartScrollOptions {
  threshold?: number;
  behavior?: ScrollBehavior;
}

export function useSmartScroll<T extends HTMLElement>({
  threshold = 80,
  behavior = "smooth",
}: UseSmartScrollOptions = {}) {
  const containerRef = useRef<T>(null);
  const userPinnedUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = node;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const scrollingUp = scrollTop < lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;

      if (scrollingUp && distanceFromBottom > threshold) {
        userPinnedUpRef.current = true;
      } else if (distanceFromBottom <= threshold) {
        userPinnedUpRef.current = false;
      }
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const scrollToBottom = useCallback(
    (force = false) => {
      const node = containerRef.current;
      if (!node) return;
      if (!force && userPinnedUpRef.current) return;

      requestAnimationFrame(() => {
        if (typeof node.scrollTo === "function") {
          node.scrollTo({ top: node.scrollHeight, behavior });
        } else {
          node.scrollTop = node.scrollHeight;
        }
      });
    },
    [behavior],
  );

  const forceScrollToBottom = useCallback(() => {
    userPinnedUpRef.current = false;
    scrollToBottom(true);
  }, [scrollToBottom]);

  return { containerRef, scrollToBottom, forceScrollToBottom };
}
