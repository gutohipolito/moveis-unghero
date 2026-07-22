import { formatDateBR } from "@/lib/brazilDate";

const STAGE_DATE_STATUSES = new Set(["APROVADO", "CONFERENCIA_TECNICA", "PRODUCAO"]);

export function shouldShowStageEntryDate(status: string) {
  return STAGE_DATE_STATUSES.has(status);
}

/** Inferência da data de entrada na etapa atual (timeline + 1ª aprovação de orçamento). */
export function resolveStageEntryAt(
  status: string,
  timeline: Array<{ acao: string; data: string }> | null | undefined,
  firstQuoteApprovedAt?: string | null
): string | null {
  const entries = timeline ?? [];

  if (status === "APROVADO") {
    const fromTimeline = entries.find(
      (t) =>
        /para\s+APROVADO\b/i.test(t.acao) ||
        /para\s+Aprovados/i.test(t.acao) ||
        /em\s+Aprovados/i.test(t.acao) ||
        /movido para Aprovados/i.test(t.acao)
    );
    return fromTimeline?.data ?? firstQuoteApprovedAt ?? null;
  }

  if (status === "CONFERENCIA_TECNICA") {
    return (
      entries.find((t) => /para\s+CONFERENCIA_TECNICA\b/i.test(t.acao))?.data ?? null
    );
  }

  if (status === "PRODUCAO") {
    return entries.find((t) => /para\s+PRODUCAO\b/i.test(t.acao))?.data ?? null;
  }

  return null;
}

/** Texto sutil para o card do funil. */
export function formatStageEntryLabel(status: string, isoDate: string | null | undefined) {
  if (!isoDate) return null;
  const date = formatDateBR(isoDate);
  if (status === "APROVADO") return `Aprovado em ${date}`;
  if (status === "CONFERENCIA_TECNICA") return `Conf. técnica desde ${date}`;
  if (status === "PRODUCAO") return `Produção desde ${date}`;
  return date;
}
