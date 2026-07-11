"use client";

import { useCallback, useEffect, useState } from "react";
import { NAV_SECTIONS } from "@/components/SidebarNav";

const STORAGE_KEY = "sidebar-sections-collapsed";
const EVENT = "sidebar-sections-change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Estado compartilhado de recolhimento das seções (menus "pai") do sidebar.
 * Persiste em localStorage e sincroniza entre o cabeçalho e a navegação
 * via um CustomEvent, para que o botão de "abrir/fechar todos" e os toggles
 * individuais fiquem sempre em sincronia.
 */
export function useSidebarSections() {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(read());
    const handler = () => setCollapsed(read());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isSectionCollapsed = useCallback(
    (section: string) => collapsed.includes(section),
    [collapsed]
  );

  const toggleSection = useCallback((section: string) => {
    const cur = read();
    const next = cur.includes(section)
      ? cur.filter((s) => s !== section)
      : [...cur, section];
    write(next);
    setCollapsed(next);
  }, []);

  const collapseAll = useCallback(() => {
    const next = [...NAV_SECTIONS];
    write(next);
    setCollapsed(next);
  }, []);

  const expandAll = useCallback(() => {
    write([]);
    setCollapsed([]);
  }, []);

  const allCollapsed =
    mounted && NAV_SECTIONS.every((section) => collapsed.includes(section));

  return {
    mounted,
    isSectionCollapsed,
    toggleSection,
    collapseAll,
    expandAll,
    allCollapsed,
  };
}
