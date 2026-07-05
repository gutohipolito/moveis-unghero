import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionSafe } from "@/lib/auth";
import { PrivacyProvider } from "@/context/PrivacyContext";
import SidebarToggle from "@/components/SidebarToggle";
import SidebarNav from "@/components/SidebarNav";
import DashboardHeader from "@/components/DashboardHeader";
import MobileBottomNav from "@/components/MobileBottomNav";

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

  return (
    <PrivacyProvider>
      <div className="flex min-h-screen bg-background">
        <aside className="app-sidebar hidden md:flex md:w-56 lg:w-60 md:flex-col md:fixed md:inset-y-0 z-30">
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

        <div className="flex flex-col flex-1 md:pl-56 lg:pl-60 min-w-0">
          <div className="md:hidden sticky top-0 flex items-center justify-between h-14 px-4 z-40 bg-card border-b border-border pt-[env(safe-area-inset-top,0)]">
            <Link href="/crm" aria-label="Móveis Unghero">
              <img src="/logo.png" alt="Móveis Unghero" className="logo-sidebar h-8 w-auto object-contain" />
            </Link>
            <SidebarToggle user={user} />
          </div>

          <div className="hidden md:block">
            <DashboardHeader user={user} />
          </div>

          <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-7 overflow-x-hidden min-w-0 dashboard-main-mobile md:pb-7">
            <div className="w-full space-y-5">{children}</div>
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </PrivacyProvider>
  );
}
