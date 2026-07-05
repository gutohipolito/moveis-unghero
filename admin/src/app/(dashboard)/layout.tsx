import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionSafe } from "@/lib/auth";
import { PrivacyProvider } from "@/context/PrivacyContext";
import SidebarToggle from "@/components/SidebarToggle";
import SidebarNav from "@/components/SidebarNav";
import DashboardHeader from "@/components/DashboardHeader";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { getNotifications } from "@/app/actions/notifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionSafe(await headers());

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const companyId = user.company_id || "mock-company-id";
  const notificationsRes = await getNotifications(companyId);
  const notifications = notificationsRes.notifications;

  return (
    <PrivacyProvider>
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
          <MobileTopBar
            user={{
              ...user,
              email: user.email ?? "",
            }}
            companyId={companyId}
            initialNotifications={notifications}
          />

          <div className="hidden md:block">
            <DashboardHeader
              user={user}
              companyId={companyId}
              initialNotifications={notifications}
            />
          </div>

          <PwaInstallBanner />

          <main className="flex-1 px-[var(--space-4)] py-[var(--space-4)] sm:px-[var(--space-5)] md:px-[var(--space-6)] md:py-[var(--space-6)] overflow-x-hidden min-w-0 dashboard-main-mobile md:pb-[var(--space-6)]">
            <div className="w-full space-y-[var(--space-5)]">{children}</div>
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </PrivacyProvider>
  );
}
