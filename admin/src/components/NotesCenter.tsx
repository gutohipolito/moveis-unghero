"use client";

import React, { useRef, useState, useEffect, useTransition, useCallback } from "react";
import { StickyNote, Pin, Trash2 } from "lucide-react";
import type { OperatorNote } from "@/lib/operatorWorkspace";
import { formatNoteDate } from "@/lib/operatorWorkspace";
import {
  createOperatorNote,
  deleteOperatorNote,
  toggleOperatorNotePin,
} from "@/app/actions/operatorWorkspace";
import { getWorkspaceLiveSnapshot } from "@/app/actions/liveSnapshots";
import { useLiveEntity } from "@/context/LiveSyncContext";

interface NotesCenterProps {
  companyId: string;
  initialNotes: OperatorNote[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function NotesCenter({
  companyId,
  initialNotes,
  isOpen,
  onOpenChange,
}: NotesCenterProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
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
    if (result.success && result.notes) {
      setNotes(result.notes);
    }
  }, [companyId]);

  useLiveEntity("workspace", {
    sync: syncWorkspace,
    enabled: !pending && !open,
  });

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

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

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await createOperatorNote(draft);
      if (!result.success) {
        setError(result.error ?? "Erro ao salvar.");
        return;
      }
      if (result.note) {
        setNotes((prev) => [result.note!, ...prev]);
      }
      setDraft("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteOperatorNote(id);
      if (result.success) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    });
  }

  function handleTogglePin(id: string) {
    startTransition(async () => {
      const result = await toggleOperatorNotePin(id);
      if (result.success) {
        setNotes((prev) =>
          [...prev]
            .map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
            .sort((a, b) => {
              if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })
        );
      }
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="notification-trigger"
        aria-label="Notas"
        aria-expanded={open}
      >
        <StickyNote className="h-4 w-4" />
        {notes.length > 0 && (
          <span className="notification-badge">
            {notes.length > 9 ? "9+" : notes.length}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div className="notification-panel-heading">
              <p className="notification-panel-title">Notas</p>
              <p className="notification-panel-subtitle">
                Anotações rápidas do dia a dia.
              </p>
            </div>
            {notes.length > 0 && (
              <div className="notification-panel-meta">
                <span className="notification-panel-count">
                  {notes.length} nota{notes.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <div className="p-3 border-b border-border/60 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Anotação rápida..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {error && (
              <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={pending || !draft.trim()}
              onClick={handleAdd}
              className="w-full text-[10px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-2 rounded-md transition-colors cursor-pointer disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Adicionar nota"}
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="notification-empty">
              <StickyNote className="h-8 w-8 text-muted-foreground/40 mb-2 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>
            </div>
          ) : (
            <ul className="notification-list">
              {notes.map((note) => (
                <li key={note.id} className="notification-item group">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note.id)}
                        className={`p-1 rounded-md hover:bg-muted cursor-pointer ${note.pinned ? "text-primary" : "text-muted-foreground"}`}
                        aria-label={note.pinned ? "Desafixar nota" : "Fixar nota"}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        aria-label="Excluir nota"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {formatNoteDate(note.updatedAt)}
                    {note.pinned ? " · Fixada" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
