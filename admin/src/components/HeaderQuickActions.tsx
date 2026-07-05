"use client";

import { useState } from "react";
import NotificationCenter from "@/components/NotificationCenter";
import NotesCenter from "@/components/NotesCenter";
import RemindersCenter from "@/components/RemindersCenter";
import type { AppNotification } from "@/lib/notifications";
import type { OperatorNote, OperatorReminder } from "@/lib/operatorWorkspace";

type HeaderMenu = "notes" | "reminders" | "notifications";

interface HeaderQuickActionsProps {
  companyId: string;
  initialNotifications: AppNotification[];
  initialNotes: OperatorNote[];
  initialReminders: OperatorReminder[];
}

export default function HeaderQuickActions({
  companyId,
  initialNotifications,
  initialNotes,
  initialReminders,
}: HeaderQuickActionsProps) {
  const [openMenu, setOpenMenu] = useState<HeaderMenu | null>(null);

  return (
    <div className="flex items-center gap-1">
      <NotesCenter
        initialNotes={initialNotes}
        isOpen={openMenu === "notes"}
        onOpenChange={(open) => setOpenMenu(open ? "notes" : null)}
      />
      <RemindersCenter
        initialReminders={initialReminders}
        isOpen={openMenu === "reminders"}
        onOpenChange={(open) => setOpenMenu(open ? "reminders" : null)}
      />
      <NotificationCenter
        companyId={companyId}
        initialNotifications={initialNotifications}
        isOpen={openMenu === "notifications"}
        onOpenChange={(open) => setOpenMenu(open ? "notifications" : null)}
      />
    </div>
  );
}
