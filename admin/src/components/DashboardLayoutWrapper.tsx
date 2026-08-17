"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import SidebarNav from "@/components/SidebarNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import SuggestionFab from "@/components/melhorias/SuggestionFab";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";
import { ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useSidebarSections } from "@/lib/useSidebarSections";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { homePathForRole } from "@/lib/permissions";
import { usePermissions } from "@/context/PermissionsContext";
import { cn } from "@/lib/utils";

const ProjectChatDock = dynamic(
  () => import("@/components/project-chat/ProjectChatDock"),
  { ssr: false }
);

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
  const { isTablet, isCollapsed, toggleCollapsed } = useTabletLayout();
  const { allCollapsed, collapseAll, expandAll } = useSidebarSections();
  const { isOpsLimited } = usePermissions();
  const homeHref = homePathForRole(user.cargo);

  return (
    <div
      className={`flex min-h-screen bg-background${isTablet ? " dashboard-shell-tablet" : ""}`}
      data-layout={isTablet ? "tablet" : "desktop"}
    >
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
                  href={homeHref}
                  prefetch={false}
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
                  onClick={toggleCollapsed}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-150 transition-all cursor-pointer flex items-center justify-center"
                  title="Expandir menu lateral"
                  aria-label="Expandir menu lateral"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <>
                <Link href={homeHref} prefetch={false} aria-label="Móveis Unghero" className="flex items-center">
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
                    onClick={toggleCollapsed}
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

        <main
          className={cn(
            "flex-1 overflow-x-hidden min-w-0 dashboard-main dashboard-main-mobile",
            isOpsLimited && "dashboard-main-no-mobile-nav"
          )}
        >
          <ReadOnlyBanner />
          <div className="w-full dashboard-main-stack">{children}</div>
        </main>
      </div>

      <MobileBottomNav />
      <div
        className={cn(
          "fixed z-40 right-4 md:right-6 flex flex-col-reverse items-center gap-3",
          "bottom-[calc(var(--mobile-nav-height)_+_env(safe-area-inset-bottom)_+_1.5rem)]",
          "md:bottom-12",
          isOpsLimited && "bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] md:bottom-12"
        )}
      >
        <SuggestionFab stacked />
        <ProjectChatDock />
      </div>
    </div>
  );
}
