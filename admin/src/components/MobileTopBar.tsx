"use client";

import { useState } from "react";
import HeaderQuickActions from "@/components/HeaderQuickActions";
import PrivacyToggle from "@/components/PrivacyToggle";
import SensitiveToggle from "@/components/SensitiveToggle";
import SidebarToggle from "@/components/SidebarToggle";
import type { AppNotification } from "@/lib/notifications";
import type { OperatorNote, OperatorReminder } from "@/lib/operatorWorkspace";
import { usePermissions } from "@/context/PermissionsContext";
import { homePathForRole } from "@/lib/permissions";
import AppNavLink from "@/components/AppNavLink";

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
  const { isOpsLimited } = usePermissions();
  const homeHref = homePathForRole(user.cargo);

  return (
    <header className="mobile-topbar md:hidden">
      <AppNavLink href={homeHref} className="mobile-topbar-brand" aria-label="Móveis Unghero">
        <img
          src="/logo.png"
          alt=""
          className={`h-7 w-auto object-contain transition-[filter] duration-200 ${sidebarOpen ? "" : "mobile-topbar-logo-dark"}`}
        />
      </AppNavLink>
      <div className="mobile-topbar-actions">
        {!isOpsLimited && (
          <div className="flex items-center gap-1 pr-1.5 border-r border-border/80">
            <PrivacyToggle />
            <SensitiveToggle />
          </div>
        )}
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
