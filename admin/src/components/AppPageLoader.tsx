"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  beginAppNavigation,
  endAppNavigation,
  isSafeInternalPath,
  NAV_LOADING_STORAGE_KEY,
} from "@/lib/navigateApp";

function sameDestination(href: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const next = new URL(href, window.location.origin);
    return (
      next.pathname === window.location.pathname &&
      next.search === window.location.search &&
      (next.hash === window.location.hash || next.hash === "")
    );
  } catch {
    return false;
  }
}

export default function AppPageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    if (routeKeyRef.current === null) {
      routeKeyRef.current = key;
      let pending = false;
      try {
        pending = sessionStorage.getItem(NAV_LOADING_STORAGE_KEY) === "1";
      } catch {
        pending = document.documentElement.classList.contains("mu-nav-loading");
      }
      if (!pending) {
        endAppNavigation();
        return;
      }

      const started = performance.now();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        endAppNavigation();
      };

      const tryReady = () => {
        const stack = document.querySelector(".dashboard-main-stack");
        const hasDashboard = Boolean(stack && stack.childElementCount > 0);
        const hasOtherPage = !stack && document.body.childElementCount > 3;
        const minTime = performance.now() - started >= 280;
        if (minTime && (hasDashboard || hasOtherPage || document.readyState === "complete")) {
          finish();
          return true;
        }
        return false;
      };

      if (!tryReady()) {
        const tick = window.setInterval(() => {
          if (tryReady()) window.clearInterval(tick);
        }, 60);
        window.setTimeout(() => {
          window.clearInterval(tick);
          finish();
        }, 8000);
      }
      return;
    }

    if (routeKeyRef.current !== key) {
      routeKeyRef.current = key;
      endAppNavigation();
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.noLoader === "true") return;
      const href = anchor.getAttribute("href");
      if (!href || !isSafeInternalPath(href)) return;
      if (sameDestination(href)) return;

      queueMicrotask(() => {
        if (document.documentElement.classList.contains("mu-nav-loading")) return;
        beginAppNavigation();
      });
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) endAppNavigation();
    };

    let shownAt = 0;
    const watchdog = window.setInterval(() => {
      const on = document.documentElement.classList.contains("mu-nav-loading");
      if (!on) {
        shownAt = 0;
        return;
      }
      if (!shownAt) shownAt = Date.now();
      if (Date.now() - shownAt > 12000) endAppNavigation();
    }, 500);

    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearInterval(watchdog);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
