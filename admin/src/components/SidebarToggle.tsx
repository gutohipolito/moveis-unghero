"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";
import SidebarUser from "@/components/SidebarUser";

interface SidebarToggleProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    cargo?: string;
  };
}

export default function SidebarToggle({ user }: SidebarToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

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
              onPointerDown={(event) => {
                event.preventDefault();
                closeMenu();
              }}
              className="mobile-drawer-backdrop md:hidden"
              aria-label="Fechar menu"
            />
            <aside
              className="mobile-drawer app-sidebar md:hidden mobile-drawer-open"
              aria-modal="true"
              role="dialog"
              aria-label="Menu de navegação"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between h-16 px-5 shrink-0 border-b border-[hsl(var(--sidebar-border))]">
                <img
                  src="/logo.png"
                  alt="Móveis Unghero"
                  className="logo-sidebar h-10 w-auto object-contain"
                />
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeMenu();
                  }}
                  className="mobile-menu-btn mobile-drawer-close border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))]"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <SidebarNav onNavigate={closeMenu} />
              <div className="p-3 shrink-0 border-t border-[hsl(var(--sidebar-border))]">
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
        className={`mobile-menu-btn ${isOpen ? "mobile-menu-btn-open" : ""}`}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {drawer}
    </>
  );
}
