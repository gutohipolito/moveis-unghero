"use client";

import { usePrivacy } from "@/context/PrivacyContext";
import { maskDocument, maskEmail, maskPhone, maskSensitiveInText } from "@/lib/maskSensitive";

/**
 * Helpers de exibição de PII respeitando sensitiveHidden (VIEWER sempre oculto).
 * Também mascara valores/PII em textos livres (histórico) quando qualquer olho estiver fechado.
 */
export function useSensitiveDisplay() {
  const { sensitiveHidden, privacyLocked, privacyMode } = usePrivacy();
  const hide = sensitiveHidden || privacyLocked;
  /** Dinheiro + PII em texto: segue o olho financeiro OU o de dados sensíveis. */
  const hideInText = privacyMode || sensitiveHidden || privacyLocked;

  return {
    hide,
    hideInText,
    phone: (value: string | null | undefined) =>
      hide ? maskPhone(value) : (value || "—"),
    email: (value: string | null | undefined) =>
      hide ? maskEmail(value) : (value || "—"),
    document: (value: string | null | undefined) =>
      hide ? maskDocument(value) : (value || "—"),
    /** Não montar link WhatsApp quando oculto (evita vazar dígitos no href). */
    whatsappHref: (telefone: string | null | undefined) => {
      if (hide) return null;
      const digits = (telefone || "").replace(/\D/g, "");
      if (digits.length < 10) return null;
      return `https://api.whatsapp.com/send?phone=55${digits}`;
    },
    /** Histórico / logs: mascara R$, telefone e e-mail embutidos. */
    text: (value: string | null | undefined) =>
      hideInText ? maskSensitiveInText(value) : (value || ""),
  };
}
