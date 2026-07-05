export interface OperatorNote {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorReminder {
  id: string;
  title: string;
  dueAt: string;
  done: boolean;
  createdAt: string;
}

const TIMEZONE = "America/Sao_Paulo";

export function formatNoteDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatReminderDue(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isReminderOverdue(reminder: OperatorReminder) {
  if (reminder.done) return false;
  return new Date(reminder.dueAt).getTime() < Date.now();
}

export function isReminderDueToday(reminder: OperatorReminder) {
  if (reminder.done) return false;
  const due = new Date(reminder.dueAt);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

export function countActiveReminders(reminders: OperatorReminder[]) {
  return reminders.filter((r) => !r.done).length;
}

export function countUrgentReminders(reminders: OperatorReminder[]) {
  return reminders.filter((r) => !r.done && isReminderOverdue(r)).length;
}

export function toDatetimeLocalValue(iso?: string) {
  const date = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  return date
    .toLocaleString("sv-SE", { timeZone: TIMEZONE })
    .replace(" ", "T")
    .slice(0, 16);
}

export function datetimeLocalToIso(value: string) {
  return new Date(`${value}:00-03:00`).toISOString();
}
