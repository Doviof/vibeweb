/**
 * ThemeTransition module — encapsulates circular reveal animation for theme toggle.
 * Uses View Transition API when available, with graceful degradation.
 */

import { getViewport } from "./responsive.ts";

export type Theme = "light" | "dark";

export interface ThemeTransitionOptions {
  /** Called to apply the theme change */
  applyTheme: () => void;
  /** Element that triggered the transition (for origin calculation) */
  originElement: HTMLElement;
  /** Whether reduced motion is preferred */
  reducedMotion: boolean;
}

/**
 * Calculates the circular reveal animation origin and radius.
 * Origin is the center of the trigger element.
 * Radius reaches the farthest viewport corner.
 */
function calculateRevealGeometry(originElement: HTMLElement) {
  const vp = getViewport();
  const bounds = originElement.getBoundingClientRect();
  const x = bounds.left + bounds.width / 2;
  const y = bounds.top + bounds.height / 2;

  // Reach farthest corner even when activated by keyboard (bounds may be off-screen)
  const radius = Math.hypot(
    Math.max(x, vp.width - x),
    Math.max(y, vp.height - y),
  );

  // View-transition snapshots can resolve px differently under browser zoom.
  // Percentages keep origin and radius in the snapshot's coordinate space.
  // CSS circle percentages use normalized diagonal as reference.
  const originX = (x / vp.width) * 100;
  const originY = (y / vp.height) * 100;
  const radiusPercent =
    (radius / (Math.hypot(vp.width, vp.height) / Math.SQRT2)) * 100 + 0.5;

  return {
    origin: `${originX}% ${originY}%`,
    radius: `${radiusPercent}%`,
  };
}

/**
 * Executes theme transition with circular reveal animation.
 * Falls back to instant apply if View Transition API unavailable or motion reduced.
 */
export async function transitionTheme(
  options: ThemeTransitionOptions,
): Promise<void> {
  const { applyTheme, originElement, reducedMotion } = options;

  const transitionDocument = document as Document & {
    startViewTransition?: (update: () => void) => { finished: Promise<void> };
  };

  if (!transitionDocument.startViewTransition || reducedMotion) {
    applyTheme();
    return;
  }

  const geometry = calculateRevealGeometry(originElement);
  const root = document.documentElement;

  root.style.setProperty("--theme-origin", geometry.origin);
  root.style.setProperty("--theme-radius", geometry.radius);
  root.dataset.themeTransition = "reveal";

  try {
    const transition = transitionDocument.startViewTransition(applyTheme);
    await transition.finished;
  } catch {
    // Transition may be skipped if another starts before this finishes
    applyTheme();
  } finally {
    delete root.dataset.themeTransition;
    root.style.removeProperty("--theme-origin");
    root.style.removeProperty("--theme-radius");
  }
}
