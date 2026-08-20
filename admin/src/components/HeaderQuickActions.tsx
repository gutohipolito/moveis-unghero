"use client";

import { useState } from "react";
import NotificationCenter from "@/components/NotificationCenter";
import NotesCenter from "@/components/NotesCenter";
import RemindersCenter from "@/components/RemindersCenter";
import ProjectChatCenter from "@/components/project-chat/ProjectChatCenter";
import type { AppNotification } from "@/lib/notifications";
import type { OperatorNote, OperatorReminder } from "@/lib/operatorWorkspace";
import { usePermissions } from "@/context/PermissionsContext";

type HeaderMenu = "chats" | "notes" | "reminders" | "notifications";
export type HeaderQuickActionItem = HeaderMenu;

interface HeaderQuickActionsProps {
  companyId: string;
  initialNotifications: AppNotification[];
  initialNotes: OperatorNote[];
  initialReminders: OperatorReminder[];
  /** Quais ícones renderizar. Padrão: todos (respeitando isReadOnly). */
  items?: HeaderQuickActionItem[];
}

const DEFAULT_ITEMS: HeaderQuickActionItem[] = [
  "chats",
  "notes",
  "reminders",
  "notifications",
];

export default function HeaderQuickActions({
  companyId,
  initialNotifications,
  initialNotes,
  initialReminders,
  items = DEFAULT_ITEMS,
}: HeaderQuickActionsProps) {
  const [openMenu, setOpenMenu] = useState<HeaderMenu | null>(null);
  const { isReadOnly } = usePermissions();
  const show = (key: HeaderQuickActionItem) => items.includes(key);

  return (
    <div className="flex items-center gap-1">
      {show("chats") ? (
        <ProjectChatCenter
          isOpen={openMenu === "chats"}
          onOpenChange={(open) => setOpenMenu(open ? "chats" : null)}
        />
      ) : null}
      {show("notes") ? (
        <NotesCenter
          companyId={companyId}
          initialNotes={initialNotes}
          isOpen={openMenu === "notes"}
          onOpenChange={(open) => setOpenMenu(open ? "notes" : null)}
        />
      ) : null}
      {show("reminders") ? (
        <RemindersCenter
          companyId={companyId}
          initialReminders={initialReminders}
          isOpen={openMenu === "reminders"}
          onOpenChange={(open) => setOpenMenu(open ? "reminders" : null)}
        />
      ) : null}
      {show("notifications") && !isReadOnly ? (
        <NotificationCenter
          isOpen={openMenu === "notifications"}
          onOpenChange={(open) => setOpenMenu(open ? "notifications" : null)}
        />
      ) : null}
    </div>
  );
}
