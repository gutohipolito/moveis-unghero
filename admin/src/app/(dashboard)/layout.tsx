import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCachedSession } from "@/lib/session";
import { DEFAULT_COMPANY_ID } from "@/lib/constants";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { LiveSyncProvider } from "@/context/LiveSyncContext";
import { getNotifications } from "@/app/actions/notifications";
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper";
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
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{if(localStorage.getItem('unghero_privacy_v2')!=='false'){document.body.classList.add('privacy-active');}}catch(e){}})();",
        }}
      />
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
          header={
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
          }
        >
          {children}
        </DashboardLayoutWrapper>
      </LiveSyncProvider>
      </NotificationProvider>
    </PrivacyProvider>
  );
}
