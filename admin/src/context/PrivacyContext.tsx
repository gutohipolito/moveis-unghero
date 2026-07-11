"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface PrivacyContextType {
  privacyMode: boolean;
  togglePrivacy: () => void;
  // Ocultação de dados sensíveis de contato/documento (telefone, e-mail, CPF/CNPJ).
  // Vem OCULTO por padrão; o operador libera pelo ícone de olho.
  sensitiveHidden: boolean;
  toggleSensitive: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  privacyMode: false,
  togglePrivacy: () => {},
  sensitiveHidden: true,
  toggleSensitive: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);
  // Padrão: dados sensíveis SEMPRE começam ocultos
  const [sensitiveHidden, setSensitiveHidden] = useState(true);

  // Carrega estado inicial do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("unghero_privacy_mode");
    if (stored === "true") {
      setPrivacyMode(true);
      document.body.classList.add("privacy-active");
    }
    // Dados sensíveis: só ficam visíveis se o operador tiver liberado explicitamente
    const storedSensitive = localStorage.getItem("unghero_sensitive_hidden");
    setSensitiveHidden(storedSensitive !== "false");
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

  const toggleSensitive = () => {
    setSensitiveHidden((prev) => {
      const nextValue = !prev;
      localStorage.setItem("unghero_sensitive_hidden", String(nextValue));
      return nextValue;
    });
  };

  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacy, sensitiveHidden, toggleSensitive }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
