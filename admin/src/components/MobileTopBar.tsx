"use client";

import { useState } from "react";
import Link from "next/link";
import HeaderQuickActions from "@/components/HeaderQuickActions";
import SidebarToggle from "@/components/SidebarToggle";
import type { AppNotification } from "@/lib/notifications";
import type { OperatorNote, OperatorReminder } from "@/lib/operatorWorkspace";

interface MobileTopBarProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    cargo?: string;
  };
  companyId: string;
  initialNotifications: AppNotification[];
  initialNotes: OperatorNote[];
  initialReminders: OperatorReminder[];
  isDbOnline?: boolean;
}

export default function MobileTopBar({
  user,
  companyId,
  initialNotifications,
  initialNotes,
  initialReminders,
  isDbOnline = true,
}: MobileTopBarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <header className="mobile-topbar md:hidden">
      <Link href="/crm" className="mobile-topbar-brand" aria-label="Móveis Unghero">
        <img
          src="/logo.png"
          alt=""
          className={`h-7 w-auto object-contain transition-[filter] duration-200 ${sidebarOpen ? "" : "mobile-topbar-logo-dark"}`}
        />
      </Link>
      <div className="mobile-topbar-actions">
        {/* Status do Banco de Dados Mobile */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200/40 rounded-lg select-none mr-0.5">
          <span className="relative flex h-1.5 w-1.5">
            {isDbOnline ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
            )}
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">BD</span>
        </div>

        <HeaderQuickActions
          companyId={companyId}
          initialNotifications={initialNotifications}
          initialNotes={initialNotes}
          initialReminders={initialReminders}
        />
        <SidebarToggle user={user} onOpenChange={setSidebarOpen} />
      </div>
    </header>
  );
}
