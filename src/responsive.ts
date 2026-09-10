/**
 * Responsive module — viewport queries, breakpoint matching, safe-area calculation.
 * Centralizes all device-dependent logic into one interface.
 */

export const BREAKPOINTS = {
  mobile: 700,
  tablet: 1100,
  shortHeight: 600,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export interface Viewport {
  width: number;
  height: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/**
 * Detects if Small Viewport Height (svh) units are supported.
 * Falls back to vh on older browsers.
 */
export function supportsSmallViewport(): boolean {
  if (typeof window === "undefined") return false;
  return CSS.supports("height", "100svh");
}

/**
 * Returns current viewport dimensions and safe-area insets.
 * Safe-area insets come from CSS env() values, parsed from computed styles.
 */
export function getViewport(): Viewport {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Parse safe-area insets from CSS env() via a temporary element
  const probe = document.createElement("div");
  probe.style.cssText = `
    position: fixed;
    top: env(safe-area-inset-top, 0px);
    right: env(safe-area-inset-right, 0px);
    bottom: env(safe-area-inset-bottom, 0px);
    left: env(safe-area-inset-left, 0px);
    pointer-events: none;
    visibility: hidden;
  `;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  const safeAreaInsets = {
    top: parseFloat(computed.top) || 0,
    right: parseFloat(computed.right) || 0,
    bottom: parseFloat(computed.bottom) || 0,
    left: parseFloat(computed.left) || 0,
  };
  document.body.removeChild(probe);

  return { width, height, safeAreaInsets };
}

/**
 * Checks if current viewport matches a breakpoint condition.
 */
export function matchesBreakpoint(
  condition: "mobile" | "tablet" | "shortHeight",
): boolean {
  const vp = getViewport();
  switch (condition) {
    case "mobile":
      return vp.width <= BREAKPOINTS.mobile;
    case "tablet":
      return vp.width > BREAKPOINTS.mobile && vp.width <= BREAKPOINTS.tablet;
    case "shortHeight":
      return vp.height <= BREAKPOINTS.shortHeight && vp.width > BREAKPOINTS.mobile;
    default:
      return false;
  }
}

/**
 * Returns CSS custom property values for responsive layout.
 * These replace hardcoded --header and --footer values in :root.
 */
export function getResponsiveCSSVars(): Record<string, string> {
  const vp = getViewport();
  const isMobile = vp.width <= BREAKPOINTS.mobile;

  const headerBase = isMobile ? 84 : 44;
  const footerBase = isMobile ? 36 : 32;

  const header = headerBase + vp.safeAreaInsets.top;
  const footer = footerBase + vp.safeAreaInsets.bottom;

  return {
    "--header": `${header}px`,
    "--footer": `${footer}px`,
    "--safe-top": `${vp.safeAreaInsets.top}px`,
    "--safe-bottom": `${vp.safeAreaInsets.bottom}px`,
    "--safe-left": `${vp.safeAreaInsets.left}px`,
    "--safe-right": `${vp.safeAreaInsets.right}px`,
  };
}

/**
 * Applies responsive CSS variables to document root.
 */
export function applyResponsiveCSSVars(): void {
  const vars = getResponsiveCSSVars();
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}
