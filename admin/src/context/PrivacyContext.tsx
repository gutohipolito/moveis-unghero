"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface PrivacyContextType {
  privacyMode: boolean;
  togglePrivacy: () => void;
  sensitiveHidden: boolean;
  toggleSensitive: () => void;
  /** Conta VIEWER: olho travado fechado, sem toggle. */
  privacyLocked: boolean;
}

const PrivacyContext = createContext<PrivacyContextType>({
  privacyMode: true,
  togglePrivacy: () => {},
  sensitiveHidden: true,
  toggleSensitive: () => {},
  privacyLocked: false,
});

export function PrivacyProvider({
  children,
  privacyLocked = false,
}: {
  children: React.ReactNode;
  privacyLocked?: boolean;
}) {
  const [privacyMode, setPrivacyMode] = useState(true);
  const [sensitiveHidden, setSensitiveHidden] = useState(true);

  useEffect(() => {
    if (privacyLocked) {
      setPrivacyMode(true);
      setSensitiveHidden(true);
      document.body.classList.add("privacy-active");
      document.body.classList.add("viewer-privacy-lock");
      return () => {
        document.body.classList.remove("viewer-privacy-lock");
      };
    }

    document.body.classList.remove("viewer-privacy-lock");

    const stored = localStorage.getItem("unghero_privacy_v2");
    const active = stored !== "false";
    setPrivacyMode(active);
    if (active) {
      document.body.classList.add("privacy-active");
    } else {
      document.body.classList.remove("privacy-active");
    }
    const storedSensitive = localStorage.getItem("unghero_sensitive_hidden");
    setSensitiveHidden(storedSensitive !== "false");
  }, [privacyLocked]);

  const togglePrivacy = () => {
    if (privacyLocked) return;
    setPrivacyMode((prev) => {
      const nextValue = !prev;
      localStorage.setItem("unghero_privacy_v2", String(nextValue));
      if (nextValue) {
        document.body.classList.add("privacy-active");
      } else {
        document.body.classList.remove("privacy-active");
      }
      return nextValue;
    });
  };

  const toggleSensitive = () => {
    if (privacyLocked) return;
    setSensitiveHidden((prev) => {
      const nextValue = !prev;
      localStorage.setItem("unghero_sensitive_hidden", String(nextValue));
      return nextValue;
    });
  };

  return (
    <PrivacyContext.Provider
      value={{
        privacyMode: privacyLocked ? true : privacyMode,
        togglePrivacy,
        sensitiveHidden: privacyLocked ? true : sensitiveHidden,
        toggleSensitive,
        privacyLocked,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
