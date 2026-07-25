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
 * Valor monetário que respeita o olho global / VIEWER / olho local da página.
 * Com privacyMode (ou `hidden`): não renderiza o número real (só placeholder).
 */
export function PrivacyMoney({
  value,
  className,
  as: Tag = "span",
  hidden,
}: {
  value: number;
  className?: string;
  as?: "span" | "strong" | "p" | "td" | "div";
  /** Se informado, sobrescreve o olho global (ex.: olho local do Kanban). */
  hidden?: boolean;
}) {
  const { privacyMode } = usePrivacy();
  const isHidden = hidden ?? privacyMode;
  return (
    <Tag
      className={cn("privacy-value tabular-nums", className)}
      title={isHidden ? "Valor oculto" : undefined}
    >
      {isHidden ? MONEY_HIDDEN_LABEL : formatMoneyBRL(value)}
    </Tag>
  );
}
