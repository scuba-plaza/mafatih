import { useEffect } from "react";

const HEIGHT = "--visual-viewport-height";

interface VisualViewportLike {
  height: number;
  offsetTop: number;
}

export function visibleViewportHeight(viewport: VisualViewportLike | null, layoutHeight: number): number {
  if (viewport === null || layoutHeight <= 0) {
    return layoutHeight;
  }
  return Math.min(Math.max(0, viewport.height + viewport.offsetTop), layoutHeight);
}

export function useVisualViewport(): void {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = typeof window.visualViewport === "undefined" ? null : window.visualViewport;
    if (viewport === null) {
      root.style.setProperty(HEIGHT, "100dvh");
      return;
    }
    const apply = () => {
      root.style.setProperty(HEIGHT, `${visibleViewportHeight(viewport, window.innerHeight)}px`);
    };
    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
      window.removeEventListener("orientationchange", apply);
      root.style.removeProperty(HEIGHT);
    };
  }, []);
}
