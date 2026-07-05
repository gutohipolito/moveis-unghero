export type ClientTab = "leads" | "negociacoes" | "clientes";

const CLIENTE_PROJECT_STATUSES = new Set([
  "APROVADO",
  "PRODUCAO",
  "INSTALACAO",
  "FINALIZADO",
]);

const NEGOCIACAO_PROJECT_STATUSES = new Set([
  "ORCAMENTO",
  "NEGOCIACAO",
  "CONFERENCIA_TECNICA",
]);

interface ClientLike {
  status: string;
  projects?: { status_geral: string }[];
}

export function isClienteRecord(client: ClientLike): boolean {
  if (client.status === "APROVADO") return true;
  return (client.projects ?? []).some((p) =>
    CLIENTE_PROJECT_STATUSES.has(p.status_geral)
  );
}

export function isNegociacaoRecord(client: ClientLike): boolean {
  if (isClienteRecord(client)) return false;
  if (client.status === "NEGOCIACAO") return true;
  return (client.projects ?? []).some((p) =>
    NEGOCIACAO_PROJECT_STATUSES.has(p.status_geral)
  );
}

export function getClientTab(client: ClientLike): ClientTab {
  if (isClienteRecord(client)) return "clientes";
  if (isNegociacaoRecord(client)) return "negociacoes";
  return "leads";
}

export const CLIENT_TAB_LABELS: Record<
  ClientTab,
  { title: string; description: string }
> = {
  leads: {
    title: "Leads",
    description: "Prospecção e contatos iniciais ainda não em negociação ativa.",
  },
  negociacoes: {
    title: "Negociações",
    description: "Orçamentos em andamento e fechamento comercial.",
  },
  clientes: {
    title: "Clientes",
    description: "Contratos aprovados e obras em produção ou entregues.",
  },
};
