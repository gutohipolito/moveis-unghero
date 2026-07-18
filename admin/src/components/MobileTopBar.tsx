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
}

export default function MobileTopBar({
  user,
  companyId,
  initialNotifications,
  initialNotes,
  initialReminders,
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
