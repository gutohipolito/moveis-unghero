"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { ProjectChatFocus } from "@/lib/projectChat";

type ProjectChatContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  focus: ProjectChatFocus | null;
  setFocus: (focus: ProjectChatFocus | null) => void;
  activeProjectId: string | null;
  openProject: (projectId: string, clientName?: string) => void;
  showInbox: () => void;
};

const ProjectChatContext = createContext<ProjectChatContextValue | null>(null);

function projectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

export function ProjectChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [focusOverride, setFocusOverride] = useState<ProjectChatFocus | null>(null);
  const [openedProjectId, setOpenedProjectId] = useState<string | null>(null);

  const pathProjectId = projectIdFromPath(pathname);
  const focus = focusOverride ?? (pathProjectId ? { projectId: pathProjectId, clientName: "" } : null);

  const openProject = useCallback((projectId: string, clientName?: string) => {
    if (clientName) {
      setFocusOverride({ projectId, clientName });
    }
    setOpenedProjectId(projectId);
    setOpen(true);
  }, []);

  const showInbox = useCallback(() => {
    setOpenedProjectId(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chat = params.get("chat");
    if (chat === "1" && pathProjectId) {
      setOpenedProjectId(pathProjectId);
      setOpen(true);
    }
  }, [pathname, pathProjectId]);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      focus,
      setFocus: setFocusOverride,
      activeProjectId: openedProjectId,
      openProject,
      showInbox,
    }),
    [open, focus, openedProjectId, openProject, showInbox]
  );

  return <ProjectChatContext.Provider value={value}>{children}</ProjectChatContext.Provider>;
}

export function useProjectChat() {
  const ctx = useContext(ProjectChatContext);
  if (!ctx) {
    throw new Error("useProjectChat deve ser usado dentro de ProjectChatProvider");
  }
  return ctx;
}

/** Informa ao chat flutuante qual projeto está na tela. */
export function useProjectChatFocus(focus: ProjectChatFocus | null) {
  const ctx = useContext(ProjectChatContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setFocus(focus);
    return () => {
      ctx.setFocus(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, focus?.projectId, focus?.clientName]);
}
