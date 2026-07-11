"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SidebarNav from "@/components/SidebarNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import DashboardHeaderSlot from "@/components/DashboardHeaderSlot";
import HeaderSkeleton from "@/components/HeaderSkeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
}

export default function DashboardLayoutWrapper({
  children,
  user,
  companyId,
}: DashboardLayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

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
          {/* Cabeçalho do Sidebar com Logo / Símbolo */}
          <div
            className={`flex items-center h-16 shrink-0 transition-all duration-300 ${
              isCollapsed ? "px-4 justify-center" : "px-5"
            }`}
          >
            <Link href="/crm" aria-label="Móveis Unghero" className="flex items-center">
              {isCollapsed ? (
                <span className="text-sm font-black text-indigo-650 bg-indigo-50/80 border border-indigo-150 h-10 w-10 flex items-center justify-center rounded-xl shadow-inner select-none transition-all hover:scale-105">
                  MU
                </span>
              ) : (
                <img
                  src="/logo.png"
                  alt="Móveis Unghero"
                  className="logo-sidebar h-10 w-auto object-contain transition-all"
                />
              )}
            </Link>
          </div>

          {/* Navegação Principal */}
          <SidebarNav compact={isCollapsed} />

          {/* Botão de Toggle do Sidebar Desktop */}
          <button
            onClick={handleToggle}
            className="absolute -right-3.5 top-20 h-7 w-7 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-md flex items-center justify-center text-slate-550 hover:text-indigo-650 transition-all cursor-pointer z-50 hover:scale-110 active:scale-95"
            title={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${
          isCollapsed ? "md:pl-20" : "md:pl-[17.5rem] lg:pl-[19rem]"
        }`}
      >
        <React.Suspense fallback={<HeaderSkeleton />}>
          <DashboardHeaderSlot
            user={user}
            companyId={companyId}
          />
        </React.Suspense>

        <main className="flex-1 px-[var(--space-4)] py-[var(--space-4)] sm:px-[var(--space-5)] md:px-[var(--space-6)] md:py-[var(--space-6)] overflow-x-hidden min-w-0 dashboard-main-mobile md:pb-[var(--space-6)]">
          <div className="w-full space-y-[var(--space-5)]">{children}</div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
