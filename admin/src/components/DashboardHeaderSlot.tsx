import DashboardHeader from "@/components/DashboardHeader";
import MobileTopBar from "@/components/MobileTopBar";
import { getNotifications } from "@/app/actions/notifications";
import {
  getOperatorNotesForUser,
  getOperatorRemindersForUser,
} from "@/app/actions/operatorWorkspace";

interface DashboardHeaderSlotProps {
  user: {
    id: string;
    name: string;
    email?: string | null;
    image?: string | null;
    cargo?: string;
  };
  companyId: string;
}

export default async function DashboardHeaderSlot({
  user,
  companyId,
}: DashboardHeaderSlotProps) {
  const [notificationsRes, notesRes, remindersRes] = await Promise.all([
    getNotifications(companyId).catch(() => ({ notifications: [] })),
    getOperatorNotesForUser(user.id, companyId).catch(() => ({ notes: [] })),
    getOperatorRemindersForUser(user.id, companyId).catch(() => ({ reminders: [] })),
  ]);

  const notifications = notificationsRes.notifications;
  const notes = notesRes.notes;
  const reminders = remindersRes.reminders;

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
        initialNotifications={notifications}
        initialNotes={notes}
        initialReminders={reminders}
      />

      <div className="hidden md:block">
        <DashboardHeader
          user={headerUser}
          companyId={companyId}
          initialNotifications={notifications}
          initialNotes={notes}
          initialReminders={reminders}
        />
      </div>
    </>
  );
}
