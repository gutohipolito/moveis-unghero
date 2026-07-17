"use client";

import { useEffect, useState, type KeyboardEvent } from "react";

/**
 * Evita envio acidental na última etapa: o botão "Continuar/Próximo"
 * e o "Finalizar/Enviar" ocupam a mesma posição, e o toque residual
 * (especialmente no mobile) dispara o submit antes do usuário preencher.
 *
 * Importante: o lock é síncrono no render ao entrar na última etapa
 * (não espera o useEffect), senão o clique fantasma passa no 1º frame.
 */
export function useSubmitUnlock(isFinalStep: boolean, delayMs = 900) {
  /** 0 = bloqueado na última etapa; 1 = liberado após o delay */
  const [unlockKey, setUnlockKey] = useState(0);

  useEffect(() => {
    if (!isFinalStep) {
      setUnlockKey(0);
      return;
    }

    setUnlockKey(0);
    const timer = window.setTimeout(() => setUnlockKey(1), delayMs);
    return () => window.clearTimeout(timer);
  }, [isFinalStep, delayMs]);

  if (!isFinalStep) return true;
  return unlockKey === 1;
}

/** Impede que Enter envie o formulário fora de textareas. */
export function preventEnterSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
}
