"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

/** Tempo em que um clique recente ainda pode corrigir um RSC atrasado. */
const GUARD_MS = 8_000;
const RECOVER_EVERY_MS = 250;

type Intent = {
  href: string;
  pathname: string;
  fromPath: string;
  at: number;
  matched: boolean;
};

type NavigationIntentContextValue = {
  pendingPathname: string | null;
};

const NavigationIntentContext = createContext<NavigationIntentContextValue>({
  pendingPathname: null,
});

export function normalizeAppPath(href: string): string {
  const path = href.split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

function isAuthLanding(pathname: string): boolean {
  return pathname === "/login" || pathname === "/sem-acesso";
}

/**
 * Impede o App Router de “voltar” sozinho quando o operador troca de tela rápido.
 * O payload RSC da navegação anterior pode chegar depois e sobrescrever a atual;
 * o último clique vira o destino canônico até a navegação assentar.
 */
export function NavigationIntentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const intentRef = useRef<Intent | null>(null);
  const guardTimerRef = useRef<number | undefined>(undefined);
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const clearIntent = useCallback(() => {
    if (guardTimerRef.current !== undefined) {
      window.clearTimeout(guardTimerRef.current);
      guardTimerRef.current = undefined;
    }
    intentRef.current = null;
    setPendingPathname(null);
  }, []);

  const intend = useCallback(
    (href: string) => {
      const targetPath = normalizeAppPath(href);
      if (!targetPath) return;

      const alreadyThere = targetPath === pathnameRef.current;
      intentRef.current = {
        href: href.split("#")[0] || targetPath,
        pathname: targetPath,
        fromPath: pathnameRef.current,
        at: Date.now(),
        matched: alreadyThere,
      };

      if (guardTimerRef.current !== undefined) {
        window.clearTimeout(guardTimerRef.current);
      }
      guardTimerRef.current = window.setTimeout(() => {
        clearIntent();
      }, GUARD_MS);

      setPendingPathname(alreadyThere ? null : targetPath);
    },
    [clearIntent]
  );

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/api/")) return;

      intend(`${url.pathname}${url.search}`);
    }

    function onPopState() {
      clearIntent();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [intend, clearIntent]);

  useEffect(() => {
    return () => {
      if (guardTimerRef.current !== undefined) {
        window.clearTimeout(guardTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!intentRef.current) return;

    const tick = () => {
      const intent = intentRef.current;
      if (!intent) return;

      if (Date.now() - intent.at > GUARD_MS) {
        clearIntent();
        return;
      }

      const current = normalizeAppPath(pathnameRef.current);
      if (isAuthLanding(current)) {
        clearIntent();
        return;
      }

      if (current === intent.pathname) {
        intent.matched = true;
        setPendingPathname((prev) => (prev === null ? prev : null));
        return;
      }

      // Ainda na tela de origem — a navegação pedida não chegou.
      if (!intent.matched && current === intent.fromPath) {
        return;
      }

      router.replace(intent.href);
    };

    tick();
    const intent = intentRef.current;
    if (intent?.matched && normalizeAppPath(pathname) === intent.pathname) {
      return;
    }
    const retry = window.setInterval(tick, RECOVER_EVERY_MS);
    return () => window.clearInterval(retry);
  }, [pathname, pendingPathname, router, clearIntent]);

  const value = useMemo(() => ({ pendingPathname }), [pendingPathname]);

  return (
    <NavigationIntentContext.Provider value={value}>{children}</NavigationIntentContext.Provider>
  );
}

export function usePendingPathname(): string | null {
  return useContext(NavigationIntentContext).pendingPathname;
}

/** Pathname real, ou o destino do último clique enquanto a navegação não assenta. */
export function useActivePathname(): string {
  const pathname = usePathname();
  return usePendingPathname() ?? pathname;
}
