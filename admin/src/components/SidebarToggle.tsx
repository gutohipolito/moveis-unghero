"use client";

import React, { useState } from "react";
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
  const closeMenu = () => setIsOpen(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mobile-menu-btn"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div onClick={closeMenu} className="mobile-drawer-backdrop md:hidden" aria-hidden="true" />
      )}

      <aside
        className={`mobile-drawer md:hidden ${isOpen ? "mobile-drawer-open" : ""}`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
          <img src="/logo.png" alt="Móveis Unghero" className="logo-bronze h-9 w-auto object-contain" />
          <button onClick={closeMenu} className="mobile-menu-btn" aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarNav onNavigate={closeMenu} compact />
        <div className="p-3 shrink-0">
          <SidebarUser user={user} />
        </div>
      </aside>
    </div>
  );
}
