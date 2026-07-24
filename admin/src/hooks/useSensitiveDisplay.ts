"use client";

import { usePrivacy } from "@/context/PrivacyContext";
import { maskDocument, maskEmail, maskPhone } from "@/lib/maskSensitive";

/**
 * Helpers de exibição de PII respeitando sensitiveHidden (VIEWER sempre oculto).
 */
export function useSensitiveDisplay() {
  const { sensitiveHidden, privacyLocked } = usePrivacy();
  const hide = sensitiveHidden || privacyLocked;

  return {
    hide,
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
  };
}
