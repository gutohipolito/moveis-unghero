"use client";

import { useEffect, useState, type KeyboardEvent } from "react";

/**
 * Evita envio acidental na última etapa: o botão "Continuar/Próximo"
 * e o "Finalizar/Enviar" ocupam a mesma posição, e o toque residual
 * (especialmente no mobile) dispara o submit antes do usuário preencher.
 */
export function useSubmitUnlock(isFinalStep: boolean, delayMs = 650) {
  const [unlocked, setUnlocked] = useState(!isFinalStep);

  useEffect(() => {
    if (!isFinalStep) {
      setUnlocked(true);
      return;
    }

    setUnlocked(false);
    const timer = window.setTimeout(() => setUnlocked(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [isFinalStep, delayMs]);

  return unlocked;
}

/** Impede que Enter envie o formulário fora de textareas. */
export function preventEnterSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
}
