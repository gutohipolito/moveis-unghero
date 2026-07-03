"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface PrivacyContextType {
  privacyMode: boolean;
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  privacyMode: false,
  togglePrivacy: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);

  // Carrega estado inicial do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("unghero_privacy_mode");
    if (stored === "true") {
      setPrivacyMode(true);
      document.body.classList.add("privacy-active");
    }
  }, []);

  const togglePrivacy = () => {
    setPrivacyMode((prev) => {
      const nextValue = !prev;
      localStorage.setItem("unghero_privacy_mode", String(nextValue));
      if (nextValue) {
        document.body.classList.add("privacy-active");
      } else {
        document.body.classList.remove("privacy-active");
      }
      return nextValue;
    });
  };

  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
