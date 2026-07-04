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
        <aside className="hidden md:flex md:w-60 lg:w-64 md:flex-col md:fixed md:inset-y-0 z-30 bg-white border-r border-border">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center h-16 px-5 border-b border-border shrink-0">
              <Link href="/crm">
                <img src="/logo.png" alt="Móveis Unghero" className="logo-bronze h-10 w-auto object-contain" />
              </Link>
            </div>

            <SidebarNav />

            <div className="p-3 m-3 shrink-0">
              <SidebarUser user={user} />
            </div>
          </div>
        </aside>

        <div className="flex flex-col flex-1 md:pl-60 lg:pl-64 min-w-0">
          <header className="sticky top-0 flex items-center justify-between h-14 px-4 md:hidden z-40 backdrop-blur-md bg-white/90 border-b border-border pt-[env(safe-area-inset-top,0)]">
            <Link href="/crm">
              <img src="/logo.png" alt="Móveis Unghero" className="logo-bronze h-8 w-auto object-contain" />
            </Link>
            <SidebarToggle user={user} />
          </header>

          <main className="flex-1 p-4 sm:p-5 md:p-7 overflow-x-hidden min-w-0 dashboard-main-mobile md:pb-7">
            <div className="w-full max-w-full space-y-6 animate-in fade-in duration-300">
              {children}
            </div>
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </PrivacyProvider>
  );
}
