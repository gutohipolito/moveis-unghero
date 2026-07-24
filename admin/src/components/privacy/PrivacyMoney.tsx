"use client";

import React from "react";
import { usePrivacy } from "@/context/PrivacyContext";
import { cn } from "@/lib/utils";

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMoneyBRL(value: number) {
  return moneyFmt.format(Number.isFinite(value) ? value : 0);
}

/** Placeholder exibido quando o modo privacidade está ativo. */
export const MONEY_HIDDEN_LABEL = "R$ •••••";

/**
 * Valor monetário que respeita o olho global / VIEWER.
 * Com privacyMode: não renderiza o número real (só placeholder).
 */
export function PrivacyMoney({
  value,
  className,
  as: Tag = "span",
}: {
  value: number;
  className?: string;
  as?: "span" | "strong" | "p" | "td" | "div";
}) {
  const { privacyMode } = usePrivacy();
  return (
    <Tag
      className={cn("privacy-value tabular-nums", className)}
      title={privacyMode ? "Valor oculto" : undefined}
    >
      {privacyMode ? MONEY_HIDDEN_LABEL : formatMoneyBRL(value)}
    </Tag>
  );
}
