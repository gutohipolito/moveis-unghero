"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";
import SidebarUser from "@/components/SidebarUser";
import { useSidebarSections } from "@/lib/useSidebarSections";

interface SidebarToggleProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    cargo?: string;
  };
  onOpenChange?: (open: boolean) => void;
}

export default function SidebarToggle({ user, onOpenChange }: SidebarToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { allCollapsed, collapseAll, expandAll } = useSidebarSections();

  const openMenu = useCallback(() => {
    setIsOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeMenu]);

  const drawer =
    mounted && isOpen
      ? createPortal(
          <>
            <button
              type="button"
              onClick={closeMenu}
              className="mobile-drawer-backdrop md:hidden"
              aria-label="Fechar menu"
            />
            <aside
              className="mobile-drawer app-sidebar md:hidden mobile-drawer-open"
              aria-modal="true"
              role="dialog"
              aria-label="Menu de navegação"
            >
              <div className="mobile-drawer-header">
                <img
                  src="/logo.png"
                  alt="Móveis Unghero"
                  className="logo-sidebar h-9 w-auto object-contain"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={allCollapsed ? expandAll : collapseAll}
                    className="mobile-drawer-close-btn"
                    aria-label={allCollapsed ? "Abrir todos os menus" : "Fechar todos os menus"}
                    title={allCollapsed ? "Abrir todos os menus" : "Fechar todos os menus"}
                  >
                    {allCollapsed ? (
                      <ChevronsUpDown className="h-5 w-5" />
                    ) : (
                      <ChevronsDownUp className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="mobile-drawer-close-btn"
                    aria-label="Fechar menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <SidebarNav onNavigate={closeMenu} />
              <div className="mobile-drawer-footer">
                <SidebarUser user={user} />
              </div>
            </aside>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        className={`mobile-menu-btn ${isOpen ? "mobile-menu-btn-hidden" : ""}`}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
        tabIndex={isOpen ? -1 : 0}
      >
        <Menu className="h-5 w-5" />
      </button>
      {drawer}
    </>
  );
}
