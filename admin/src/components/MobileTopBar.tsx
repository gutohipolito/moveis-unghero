"use client";

import Link from "next/link";
import NotificationCenter from "@/components/NotificationCenter";
import SidebarToggle from "@/components/SidebarToggle";
import type { AppNotification } from "@/lib/notifications";

interface MobileTopBarProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    cargo?: string;
  };
  companyId: string;
  initialNotifications: AppNotification[];
}

export default function MobileTopBar({
  user,
  companyId,
  initialNotifications,
}: MobileTopBarProps) {
  return (
    <header className="mobile-topbar md:hidden">
      <Link href="/crm" className="mobile-topbar-brand" aria-label="Móveis Unghero">
        <img src="/logo.png" alt="" className="h-7 w-auto object-contain" />
      </Link>
      <div className="mobile-topbar-actions">
        <NotificationCenter
          companyId={companyId}
          initialNotifications={initialNotifications}
        />
        <SidebarToggle user={user} />
      </div>
    </header>
  );
}
