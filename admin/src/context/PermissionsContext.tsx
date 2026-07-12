"use client";

import React, { createContext, useContext, useMemo } from "react";

interface PermissionsContextValue {
  role: string;
  allowedModules: string[];
  isAdmin: boolean;
  can: (moduleKey: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  role: "PRODUCAO",
  allowedModules: [],
  isAdmin: false,
  can: () => false,
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
    return {
      role,
      allowedModules,
      isAdmin,
      can: (moduleKey: string) => isAdmin || set.has(moduleKey),
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
