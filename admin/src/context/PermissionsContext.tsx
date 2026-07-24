"use client";

import React, { createContext, useContext, useMemo } from "react";
import { isReadOnlyRole } from "@/lib/permissions";

interface PermissionsContextValue {
  role: string;
  allowedModules: string[];
  isAdmin: boolean;
  /** Conta VIEWER: só visualiza, sem mutações. */
  isReadOnly: boolean;
  can: (moduleKey: string) => boolean;
  canWrite: (moduleKey?: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  role: "PRODUCAO",
  allowedModules: [],
  isAdmin: false,
  isReadOnly: false,
  can: () => false,
  canWrite: () => false,
});

export function PermissionsProvider({
  role,
  allowedModules,
  children,
}: {
  role: string;
  allowedModules: string[];
  children: React.ReactNode;
}) {
  const value = useMemo<PermissionsContextValue>(() => {
    const set = new Set(allowedModules);
    const isAdmin = role === "ADMIN";
    const isReadOnly = isReadOnlyRole(role);
    return {
      role,
      allowedModules,
      isAdmin,
      isReadOnly,
      can: (moduleKey: string) => isAdmin || set.has(moduleKey),
      canWrite: (moduleKey?: string) => {
        if (isReadOnly) return false;
        if (!moduleKey) return !isReadOnly;
        return isAdmin || set.has(moduleKey);
      },
    };
  }, [role, allowedModules]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
