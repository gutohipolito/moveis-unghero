"use client";

import { useEffect, useState } from "react";

/** Tablets ~10.1″ (retrato e paisagem) com ponteiro de toque. */
export const TABLET_LAYOUT_MQ =
  "(min-width: 768px) and (max-width: 1366px) and (any-pointer: coarse)";

const SIDEBAR_DESKTOP_KEY = "sidebar-collapsed";
const SIDEBAR_TABLET_KEY = "sidebar-collapsed-tablet";

/**
 * Preferência de sidebar: no tablet inicia recolhida (ícones);
 * no desktop inicia expandida. Preferências ficam separadas.
 */
export function useTabletLayout() {
  const [isTablet, setIsTablet] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(TABLET_LAYOUT_MQ);

    const apply = (tablet: boolean) => {
      setIsTablet(tablet);
      if (tablet) {
        const saved = localStorage.getItem(SIDEBAR_TABLET_KEY);
        setIsCollapsed(saved === null ? true : saved === "true");
      } else {
        setIsCollapsed(localStorage.getItem(SIDEBAR_DESKTOP_KEY) === "true");
      }
      setReady(true);
    };

    apply(mq.matches);

    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(
        isTablet ? SIDEBAR_TABLET_KEY : SIDEBAR_DESKTOP_KEY,
        String(next)
      );
      return next;
    });
  };

  return { isTablet, isCollapsed, toggleCollapsed, ready };
}
