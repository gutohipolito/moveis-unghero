import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCachedSession } from "@/lib/session";
import { DEFAULT_COMPANY_ID } from "@/lib/constants";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { LiveSyncProvider } from "@/context/LiveSyncContext";
import { getNotifications } from "@/app/actions/notifications";
import SidebarNav from "@/components/SidebarNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import DashboardHeaderSlot from "@/components/DashboardHeaderSlot";
import HeaderSkeleton from "@/components/HeaderSkeleton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const companyId = user.company_id || DEFAULT_COMPANY_ID;
  const notificationsRes = await getNotifications(companyId).catch(() => ({
    success: false as const,
    notifications: [],
  }));

  return (
    <PrivacyProvider>
      <NotificationProvider
        companyId={companyId}
        initialNotifications={notificationsRes.notifications}
      >
      <LiveSyncProvider companyId={companyId}>
      <div className="flex min-h-screen bg-background">
        <aside className="app-sidebar hidden md:flex md:w-[17.5rem] lg:w-[19rem] md:flex-col md:fixed md:inset-y-0 z-30">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center h-16 px-5 shrink-0">
              <Link href="/crm" aria-label="Móveis Unghero">
                <img
                  src="/logo.png"
                  alt="Móveis Unghero"
                  className="logo-sidebar h-10 w-auto object-contain"
                />
              </Link>
            </div>

            <SidebarNav />
          </div>
        </aside>

        <div className="flex flex-col flex-1 md:pl-[17.5rem] lg:pl-[19rem] min-w-0">
          <Suspense fallback={<HeaderSkeleton />}>
            <DashboardHeaderSlot
              user={{
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                cargo: user.cargo,
              }}
              companyId={companyId}
            />
          </Suspense>

          <main className="flex-1 px-[var(--space-4)] py-[var(--space-4)] sm:px-[var(--space-5)] md:px-[var(--space-6)] md:py-[var(--space-6)] overflow-x-hidden min-w-0 dashboard-main-mobile md:pb-[var(--space-6)]">
            <div className="w-full space-y-[var(--space-5)]">{children}</div>
          </main>
        </div>

        <MobileBottomNav />
      </div>
      </LiveSyncProvider>
      </NotificationProvider>
    </PrivacyProvider>
  );
}
