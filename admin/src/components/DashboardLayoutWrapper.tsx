"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SidebarNav from "@/components/SidebarNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useSidebarSections } from "@/lib/useSidebarSections";

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    cargo?: string;
  };
  companyId: string;
  header: React.ReactNode;
}

export default function DashboardLayoutWrapper({
  children,
  user,
  companyId,
  header,
}: DashboardLayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { allCollapsed, collapseAll, expandAll } = useSidebarSections();

  // Carrega a preferência de colapso do localStorage no client-side
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Desktop */}
      <aside
        className={`app-sidebar hidden md:flex md:flex-col md:fixed md:inset-y-0 z-30 transition-all duration-300 ${
          isCollapsed ? "md:w-20" : "md:w-[17.5rem] lg:w-[19rem]"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 relative">
          {/* Cabeçalho do Sidebar com Logo / Símbolo e Toggle Integrado */}
          <div
            className={`flex items-center shrink-0 transition-all duration-300 ${
              isCollapsed ? "px-4 pt-5 pb-3 justify-center" : "px-5 pt-5 pb-3 h-auto justify-between"
            }`}
          >
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-1.5">
                <Link
                  href="/crm"
                  aria-label="Móveis Unghero"
                  className="h-9 w-9 rounded-lg overflow-hidden shadow-sm select-none transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <img
                    src="/icon-mu.png"
                    alt="Móveis Unghero"
                    className="h-full w-full object-cover"
                  />
                </Link>
                <button
                  onClick={handleToggle}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-150 transition-all cursor-pointer flex items-center justify-center"
                  title="Expandir menu lateral"
                  aria-label="Expandir menu lateral"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <>
                <Link href="/crm" aria-label="Móveis Unghero" className="flex items-center">
                  <img
                    src="/logo.png"
                    alt="Móveis Unghero"
                    className="logo-sidebar h-9 w-auto object-contain transition-all"
                  />
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    onClick={allCollapsed ? expandAll : collapseAll}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-150 transition-all cursor-pointer flex items-center justify-center"
                    title={allCollapsed ? "Abrir todos os menus" : "Fechar todos os menus"}
                    aria-label={allCollapsed ? "Abrir todos os menus" : "Fechar todos os menus"}
                  >
                    {allCollapsed ? (
                      <ChevronsUpDown className="h-4.5 w-4.5" />
                    ) : (
                      <ChevronsDownUp className="h-4.5 w-4.5" />
                    )}
                  </button>
                  <button
                    onClick={handleToggle}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-150 transition-all cursor-pointer flex items-center justify-center"
                    title="Recolher menu lateral"
                  >
                    <ChevronLeft className="h-4.5 w-4.5" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Navegação Principal */}
          <SidebarNav compact={isCollapsed} />
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${
          isCollapsed ? "md:pl-20" : "md:pl-[17.5rem] lg:pl-[19rem]"
        }`}
      >
        {header}

        <main className="flex-1 px-[var(--space-4)] py-[var(--space-4)] sm:px-[var(--space-5)] md:px-[var(--space-6)] md:py-[var(--space-6)] overflow-x-hidden min-w-0 dashboard-main-mobile md:pb-[var(--space-6)]">
          <div className="w-full space-y-[var(--space-5)]">{children}</div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
