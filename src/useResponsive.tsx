import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getViewport,
  matchesBreakpoint,
  applyResponsiveCSSVars,
  type Viewport,
} from "./responsive";

/**
 * React hook that subscribes to viewport changes (resize, orientation).
 * Returns current viewport dimensions and safe-area insets.
 */
export function useViewport(): Viewport {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("resize", callback);
      window.addEventListener("orientationchange", callback);
      return () => {
        window.removeEventListener("resize", callback);
        window.removeEventListener("orientationchange", callback);
      };
    },
    getViewport,
    () => ({ width: 0, height: 0, safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 } }),
  );
}

/**
 * React hook that tracks breakpoint state with matchMedia.
 * Re-renders when the viewport crosses a breakpoint boundary.
 */
export function useBreakpoint() {
  const [state, setState] = useState(() => ({
    isMobile: matchesBreakpoint("mobile"),
    isTablet: matchesBreakpoint("tablet"),
    isShortHeight: matchesBreakpoint("shortHeight"),
  }));

  useEffect(() => {
    const queries = {
      mobile: window.matchMedia(`(max-width: ${700}px)`),
      tablet: window.matchMedia(`(min-width: ${701}px) and (max-width: ${1100}px)`),
      shortHeight: window.matchMedia(`(max-height: ${600}px) and (min-width: ${701}px)`),
    };

    const update = () => {
      setState({
        isMobile: queries.mobile.matches,
        isTablet: queries.tablet.matches,
        isShortHeight: queries.shortHeight.matches,
      });
    };

    Object.values(queries).forEach((mq) => mq.addEventListener("change", update));
    return () => {
      Object.values(queries).forEach((mq) => mq.removeEventListener("change", update));
    };
  }, []);

  return state;
}

/**
 * Hook that applies responsive CSS variables on mount and viewport change.
 * Call once in the app root component.
 */
export function useResponsiveCSSVars(): void {
  useEffect(() => {
    applyResponsiveCSSVars();
    const handleResize = () => applyResponsiveCSSVars();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);
}
