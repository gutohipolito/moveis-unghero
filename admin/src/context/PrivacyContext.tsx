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
  privacyMode: true,
  togglePrivacy: () => {},
  sensitiveHidden: true,
  toggleSensitive: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  // Padrão: valores financeiros começam OCULTOS (modo apresentação).
  // O operador libera pelo ícone de olho; a escolha fica salva.
  const [privacyMode, setPrivacyMode] = useState(true);
  // Padrão: dados sensíveis SEMPRE começam ocultos
  const [sensitiveHidden, setSensitiveHidden] = useState(true);

  // Carrega estado inicial do localStorage
  useEffect(() => {
    // Chave versionada: o padrão "oculto" passa a valer mesmo para quem
    // tinha um valor antigo salvo (unghero_privacy_mode).
    const stored = localStorage.getItem("unghero_privacy_v2");
    // Só fica visível se o operador tiver liberado explicitamente ("false")
    const active = stored !== "false";
    setPrivacyMode(active);
    if (active) {
      document.body.classList.add("privacy-active");
    } else {
      document.body.classList.remove("privacy-active");
    }
    // Dados sensíveis: só ficam visíveis se o operador tiver liberado explicitamente
    const storedSensitive = localStorage.getItem("unghero_sensitive_hidden");
    setSensitiveHidden(storedSensitive !== "false");
  }, []);

  const togglePrivacy = () => {
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
