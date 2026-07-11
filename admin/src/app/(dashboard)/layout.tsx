import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { DEFAULT_COMPANY_ID } from "@/lib/constants";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { LiveSyncProvider } from "@/context/LiveSyncContext";
import { getNotifications } from "@/app/actions/notifications";
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper";

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
        <DashboardLayoutWrapper
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            cargo: user.cargo,
          }}
          companyId={companyId}
        >
          {children}
        </DashboardLayoutWrapper>
      </LiveSyncProvider>
      </NotificationProvider>
    </PrivacyProvider>
  );
}
