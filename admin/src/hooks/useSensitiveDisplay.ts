"use client";

import { usePrivacy } from "@/context/PrivacyContext";
import { formatClientEmailDisplay, hasRealClientEmail } from "@/lib/clientMatch";
import { maskDocument, maskEmail, maskPhone, maskSensitiveInText } from "@/lib/maskSensitive";

/**
 * Helpers de exibição de PII respeitando sensitiveHidden (VIEWER sempre oculto).
 * Também mascara valores/PII em textos livres (histórico) quando qualquer olho estiver fechado.
 */
export function useSensitiveDisplay() {
  const { sensitiveHidden, privacyLocked, privacyMode } = usePrivacy();
  const hide = sensitiveHidden || privacyLocked;
  const hideMoney = privacyMode || privacyLocked;
  /** Há algo a mascarar em texto livre (dinheiro e/ou contato). */
  const hideInText = hideMoney || hide;

  return {
    hide,
    hideMoney,
    hideInText,
    phone: (value: string | null | undefined) =>
      hide ? maskPhone(value) : (value || "—"),
    email: (value: string | null | undefined) => {
      if (hide && hasRealClientEmail(value)) return maskEmail(value);
      return formatClientEmailDisplay(value);
    },
    document: (value: string | null | undefined) =>
      hide ? maskDocument(value) : (value || "—"),
    /** Não montar link WhatsApp quando oculto (evita vazar dígitos no href). */
    whatsappHref: (telefone: string | null | undefined) => {
      if (hide) return null;
      const digits = (telefone || "").replace(/\D/g, "");
      if (digits.length < 10) return null;
      return `https://api.whatsapp.com/send?phone=55${digits}`;
    },
    /**
     * Histórico / logs: mascara R$ só com o olho financeiro fechado;
     * telefone/e-mail só com o olho de dados sensíveis fechado.
     */
    text: (value: string | null | undefined) => {
      if (!value) return "";
      if (!hideInText) return value;
      return maskSensitiveInText(value, { money: hideMoney, contact: hide });
    },
  };
}
