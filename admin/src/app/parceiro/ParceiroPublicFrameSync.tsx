"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_ORIGINS = [
  "https://moveisunghero.com.br",
  "https://www.moveisunghero.com.br",
] as const;

/** Avisa o wrapper HostGator para manter a URL pública alinhada à navegação. */
export default function ParceiroPublicFrameSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.parent === window) return;

    const search = window.location.search || "";
    const path = `${pathname}${search}`;

    for (const origin of PUBLIC_ORIGINS) {
      window.parent.postMessage({ type: "unghero-parceiro-nav", path }, origin);
    }
  }, [pathname]);

  return null;
}
