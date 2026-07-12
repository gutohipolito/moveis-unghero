import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCachedSession } from "@/lib/session";
import { DEFAULT_COMPANY_ID } from "@/lib/constants";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { LiveSyncProvider } from "@/context/LiveSyncContext";
import { PermissionsProvider } from "@/context/PermissionsContext";
import { getCompanyPermissions } from "@/lib/moduleAccess";
import { resolveAllowedModules } from "@/lib/permissions";
import type { Role } from "@prisma/client";
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
  const role = (user.cargo as Role) || "PRODUCAO";
  const permissions = await getCompanyPermissions(companyId);
  const allowedModules = resolveAllowedModules(permissions, role);
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
        <PermissionsProvider role={role} allowedModules={allowedModules}>
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
        </PermissionsProvider>
      </LiveSyncProvider>
      </NotificationProvider>
    </PrivacyProvider>
  );
}
