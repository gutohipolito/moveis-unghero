"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const { isOpsLimited } = usePermissions();
  const homeHref = homePathForRole(user.cargo);

  return (
    <header className={`mobile-topbar md:hidden${actionsOpen ? " mobile-topbar-actions-open" : ""}`}>
      {!actionsOpen ? (
        <AppNavLink href={homeHref} className="mobile-topbar-brand" aria-label="Móveis Unghero">
          <img
            src="/logo.png"
            alt=""
            className={`mobile-topbar-logo transition-[filter] duration-200 ${
              sidebarOpen ? "" : "mobile-topbar-logo-dark"
            }`}
          />
        </AppNavLink>
      ) : (
        <div className="mobile-topbar-tools min-w-0 flex-1">
          {!isOpsLimited ? (
            <div className="flex items-center gap-1 pr-1.5 border-r border-border/80 shrink-0">
              <PrivacyToggle />
              <SensitiveToggle />
            </div>
          ) : null}
          <HeaderQuickActions
            companyId={companyId}
            initialNotifications={initialNotifications}
            initialNotes={initialNotes}
            initialReminders={initialReminders}
            items={["chats", "notes", "reminders"]}
          />
        </div>
      )}

      <div className="mobile-topbar-actions shrink-0">
        {!actionsOpen ? (
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            className="notification-trigger"
            aria-label="Mostrar ações rápidas"
            aria-expanded={false}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActionsOpen(false)}
            className="notification-trigger"
            aria-label="Fechar ações rápidas"
            aria-expanded={true}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
          </button>
        )}
        <HeaderQuickActions
          companyId={companyId}
          initialNotifications={initialNotifications}
          initialNotes={initialNotes}
          initialReminders={initialReminders}
          items={["notifications"]}
        />
        <SidebarToggle user={user} onOpenChange={setSidebarOpen} />
      </div>
    </header>
  );
}
