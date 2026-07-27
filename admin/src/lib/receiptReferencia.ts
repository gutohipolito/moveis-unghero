import { prisma } from "@/lib/prisma";
import { formatQuoteCodigo } from "@/lib/quoteCodigo";
import {
  buildReceiptReferenteText,
  receiptPaymentNatureLabel,
  type ReceiptReferenciaContext,
} from "@/lib/receiptShare";

const MAX_TITULOS = 12;

function uniqueTitles(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const nome = raw.trim().replace(/\s+/g, " ");
    if (!nome) continue;
    const key = nome.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(nome);
    if (out.length >= MAX_TITULOS) break;
  }
  return out;
}

/**
 * Monta o contexto de referência a partir do projeto:
 * ambientes (preferência) ou títulos de itens aprovados do orçamento.
 */
export async function loadReceiptReferenciaContext(
  projectId: string,
  opts?: {
    tipo?: string | null;
    numero_parcela?: number | null;
    total_parcelas?: number | null;
    descricao?: string | null;
  }
): Promise<ReceiptReferenciaContext | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: {
      client: { select: { nome: true } },
      environments: {
        select: { nome: true },
        orderBy: { createdAt: "asc" },
      },
      quotes: {
        orderBy: [{ aprovado_em: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          id: true,
          codigo: true,
          aprovado_em: true,
          items: {
            select: { descricao: true, status: true },
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });

  if (!project) return null;

  const envTitles = uniqueTitles(project.environments.map((e) => e.nome));

  const preferredQuote =
    project.quotes.find((q) => q.aprovado_em) ||
    project.quotes.find((q) => q.items.some((i) => i.status === "APROVADO")) ||
    project.quotes[0] ||
    null;

  const approvedItemTitles = preferredQuote
    ? uniqueTitles(
        preferredQuote.items
          .filter((i) => i.status === "APROVADO")
          .map((i) => i.descricao)
      )
    : [];

  const pendingOrAllTitles = preferredQuote
    ? uniqueTitles(preferredQuote.items.map((i) => i.descricao))
    : [];

  const titulos =
    envTitles.length > 0
      ? envTitles
      : approvedItemTitles.length > 0
        ? approvedItemTitles
        : pendingOrAllTitles;

  return {
    titulos,
    residencia: project.client.nome?.trim() || null,
    orcamentoCodigo: preferredQuote ? formatQuoteCodigo(preferredQuote) : null,
    natureza: receiptPaymentNatureLabel({
      tipo: opts?.tipo,
      numero_parcela: opts?.numero_parcela,
      total_parcelas: opts?.total_parcelas,
      descricao: opts?.descricao,
    }),
  };
}

export async function suggestReceiptReferenteForProject(
  projectId: string,
  opts?: {
    tipo?: string | null;
    numero_parcela?: number | null;
    total_parcelas?: number | null;
    descricao?: string | null;
  }
): Promise<string | null> {
  const ctx = await loadReceiptReferenciaContext(projectId, opts);
  if (!ctx) return null;
  return buildReceiptReferenteText(ctx);
}
