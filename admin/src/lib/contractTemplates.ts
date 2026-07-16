/** Textos e helpers do contrato padrão (baseado no modelo usado pela marcenaria). */

export const DEFAULT_CONTRACT_TEMPLATE = {
  nome: "Prestação de Serviço — Padrão",
  titulo: "CONTRATO DE PRESTAÇÃO DE SERVIÇO",
  clausula_local:
    "O CONTRATANTE SE COMPROMETE EM DEIXAR O LOCAL DO PROJETO LIVRE E LIMPO, PARA O DIA DA MONTAGEM. O CONTRATADO AVISARÁ UNS DIAS ANTES.",
  clausula_pagamento:
    "O CONTRATANTE SE COMPROMETE EM FAZER O PAGAMENTO DO PROJETO NO VALOR DE {{valor}}, SENDO {{entrada_pct}}% DO VALOR NA ASSINATURA DO CONTRATO E O RESTANTE DOS {{saldo_pct}}% QUANDO FINALIZAR O PROJETO.",
  clausula_prazo:
    "O CONTRATADO SE COMPROMETE EM FAZER A ENTREGA DOS MÓVEIS NO MÊS DE {{mes_entrega}}, FINALIZANDO O AMBIENTE ATÉ O DIA {{data_entrega}}. CASO ACONTEÇA ALGUM PROBLEMA DE PINTURA, CANOS OU GESSO DURANTE A MONTAGEM, O CONTRATADO SE RESPONSABILIZA EM DEIXAR O LOCAL COMO ENCONTROU.",
  clausula_extra: null as string | null,
};

export function formatContractCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatContractDateLong(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

export function formatContractMonthYear(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const label = d.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  return label.toUpperCase();
}

export function formatContractDateShort(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

/** Substitui placeholders {{valor}}, {{entrada_pct}}, {{saldo_pct}}, {{mes_entrega}}, {{data_entrega}}. */
export function applyContractPlaceholders(
  text: string,
  vars: {
    valor: number;
    entrada_pct: number;
    data_entrega?: Date | string | null;
  }
) {
  const saldo = Math.max(0, 100 - vars.entrada_pct);
  const mes = vars.data_entrega ? formatContractMonthYear(vars.data_entrega) : "___";
  const data = vars.data_entrega ? formatContractDateShort(vars.data_entrega) : "__/__/____";

  return text
    .replaceAll("{{valor}}", formatContractCurrency(vars.valor))
    .replaceAll("{{entrada_pct}}", String(vars.entrada_pct))
    .replaceAll("{{saldo_pct}}", String(saldo))
    .replaceAll("{{mes_entrega}}", mes)
    .replaceAll("{{data_entrega}}", data);
}

export function buildClientAddress(parts: {
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
}) {
  const line1 = [parts.endereco, parts.numero].filter(Boolean).join(", ");
  const line2 = [parts.bairro, parts.cidade, parts.uf].filter(Boolean).join(", ");
  const cep = parts.cep ? `CEP ${parts.cep}` : "";
  return [line1, line2, cep].filter(Boolean).join(" — ");
}
