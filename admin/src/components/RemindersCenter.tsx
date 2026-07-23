"use client";

import React, { useRef, useState, useEffect, useTransition, useCallback } from "react";
import { AlarmClock, Check, Trash2 } from "lucide-react";
import type { OperatorReminder } from "@/lib/operatorWorkspace";
import {
  countActiveReminders,
  countUrgentReminders,
  formatReminderDue,
  isReminderOverdue,
  toDatetimeLocalValue,
  datetimeLocalToIso,
} from "@/lib/operatorWorkspace";
import {
  createOperatorReminder,
  deleteOperatorReminder,
  toggleOperatorReminderDone,
} from "@/app/actions/operatorWorkspace";
import { getWorkspaceLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";

interface RemindersCenterProps {
  companyId: string;
  initialReminders: OperatorReminder[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function RemindersCenter({
  companyId,
  initialReminders,
  isOpen,
  onOpenChange,
}: RemindersCenterProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [reminders, setReminders] = useState(initialReminders);
  const [title, setTitle] = useState("");
  const [dueLocal, setDueLocal] = useState(() => toDatetimeLocalValue());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = isOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };

  const syncWorkspace = useCallback(async () => {
    const result = await getWorkspaceLiveSnapshot(companyId);
    if (result.success && result.reminders) {
      setReminders(result.reminders);
    }
  }, [companyId]);

  useLiveEntity("workspace", {
    sync: syncWorkspace,
    enabled: !pending && !open,
  });

  const activeCount = countActiveReminders(reminders);
  const urgentCount = countUrgentReminders(reminders);

  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function sortReminders(items: OperatorReminder[]) {
    return [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  }

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await createOperatorReminder(title, datetimeLocalToIso(dueLocal));
      if (!result.success) {
        setError(result.error ?? "Erro ao salvar.");
        return;
      }
      if (result.reminder) {
        setReminders((prev) => sortReminders([...prev, result.reminder!]));
      }
      setTitle("");
      setDueLocal(toDatetimeLocalValue());
    });
  }

  function handleToggleDone(id: string) {
    startTransition(async () => {
      const result = await toggleOperatorReminderDone(id);
      if (result.success) {
        setReminders((prev) =>
          sortReminders(
            prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r))
          )
        );
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteOperatorReminder(id);
      if (result.success) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
      }
    });
  }

  const pendingReminders = reminders.filter((r) => !r.done);
  const doneReminders = reminders.filter((r) => r.done);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="notification-trigger"
        aria-label="Lembretes"
        aria-expanded={open}
      >
        <AlarmClock className="h-4 w-4" />
        {activeCount > 0 && (
          <span
            className={`notification-badge ${urgentCount > 0 ? "notification-badge-urgent" : ""}`}
          >
            {activeCount > 9 ? "9+" : activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div className="notification-panel-heading">
              <p className="notification-panel-title">Lembretes</p>
              <p className="notification-panel-subtitle">
                Compromissos e avisos pessoais.
              </p>
            </div>
            {activeCount > 0 && (
              <div className="notification-panel-meta">
                <span className="notification-panel-count">
                  {activeCount} pendente{activeCount !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <div className="p-3 border-b border-border/60 space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que lembrar?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {error && (
              <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={pending || !title.trim()}
              onClick={handleAdd}
              className="w-full text-[10px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-2 rounded-md transition-colors cursor-pointer disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Adicionar lembrete"}
            </button>
          </div>

          {reminders.length === 0 ? (
            <div className="notification-empty">
              <AlarmClock className="h-8 w-8 text-muted-foreground/40 mb-2 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum lembrete agendado.</p>
            </div>
          ) : (
            <ul className="notification-list">
              {pendingReminders.map((item) => (
                <li
                  key={item.id}
                  className={`notification-item group ${isReminderOverdue(item) ? "notification-item-urgent" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleDone(item.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border hover:border-primary hover:bg-primary/10 cursor-pointer flex items-center justify-center"
                      aria-label="Marcar como concluído"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatReminderDue(item.dueAt)}
                        {isReminderOverdue(item) ? " · Atrasado" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      aria-label="Excluir lembrete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
              {doneReminders.length > 0 && (
                <>
                  <li className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-muted/30">
                    Concluídos
                  </li>
                  {doneReminders.map((item) => (
                    <li key={item.id} className="notification-item group opacity-60">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleDone(item.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border border-primary bg-primary/20 text-primary cursor-pointer flex items-center justify-center"
                          aria-label="Desmarcar conclusão"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground line-through">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatReminderDue(item.dueAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          aria-label="Excluir lembrete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
