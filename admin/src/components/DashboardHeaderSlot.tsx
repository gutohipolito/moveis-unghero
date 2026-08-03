import DashboardHeader from "@/components/DashboardHeader";
import MobileTopBar from "@/components/MobileTopBar";
import type { AppNotification } from "@/lib/notifications";

interface DashboardHeaderSlotProps {
  user: {
    id: string;
    name: string;
    email?: string | null;
    image?: string | null;
    cargo?: string;
  };
  companyId: string;
  /** Já buscadas no layout — evita segundo getNotifications por navegação. */
  initialNotifications?: AppNotification[];
}

export default async function DashboardHeaderSlot({
  user,
  companyId,
  initialNotifications = [],
}: DashboardHeaderSlotProps) {
  // Notes/reminders: vazios no SSR — carregam ao abrir o painel.
  const headerUser = {
    name: user.name,
    email: user.email ?? undefined,
    image: user.image,
    cargo: user.cargo,
  };

  return (
    <>
      <MobileTopBar
        user={{
          ...headerUser,
          email: user.email ?? "",
        }}
        companyId={companyId}
        initialNotifications={initialNotifications}
        initialNotes={[]}
        initialReminders={[]}
      />

      <div className="hidden md:block">
        <DashboardHeader
          user={headerUser}
          companyId={companyId}
          initialNotifications={initialNotifications}
          initialNotes={[]}
          initialReminders={[]}
        />
      </div>
    </>
  );
}
