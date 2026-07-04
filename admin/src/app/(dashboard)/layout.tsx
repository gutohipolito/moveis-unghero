import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionSafe } from "@/lib/auth";
import { PrivacyProvider } from "@/context/PrivacyContext";
import SidebarToggle from "@/components/SidebarToggle";
import SidebarNav from "@/components/SidebarNav";
import SidebarUser from "@/components/SidebarUser";
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
            <div className="flex items-center gap-2.5 h-14 px-4 border-b border-[hsl(var(--sidebar-border))] shrink-0">
              <Link href="/crm" className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/logo.png"
                  alt=""
                  className="logo-sidebar h-8 w-8 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[hsl(var(--sidebar-foreground))] truncate leading-tight">
                    Móveis Unghero
                  </p>
                  <p className="text-[10px] text-[hsl(var(--sidebar-muted))] leading-tight">Painel operacional</p>
                </div>
              </Link>
            </div>

            <SidebarNav />

            <div className="p-3 shrink-0">
              <SidebarUser user={user} />
            </div>
          </div>
        </aside>

        <div className="flex flex-col flex-1 md:pl-56 lg:pl-60 min-w-0">
          <header className="sticky top-0 flex items-center justify-between h-14 px-4 md:hidden z-40 bg-card border-b border-border pt-[env(safe-area-inset-top,0)]">
            <Link href="/crm" className="flex items-center gap-2 min-w-0">
              <img src="/logo.png" alt="" className="h-7 w-7 object-contain shrink-0" />
              <span className="font-[family-name:var(--font-display)] text-sm font-semibold truncate">
                Unghero
              </span>
            </Link>
            <SidebarToggle user={user} />
          </header>

          <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-7 overflow-x-hidden min-w-0 dashboard-main-mobile md:pb-7">
            <div className="w-full max-w-[1400px] mx-auto space-y-5">
              {children}
            </div>
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </PrivacyProvider>
  );
}
