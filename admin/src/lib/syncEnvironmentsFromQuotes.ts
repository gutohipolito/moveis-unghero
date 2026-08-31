import type { Prisma, PrismaClient } from "@prisma/client";
import { capitalizeText } from "@/lib/utils";
import { inferEnvironmentTypeFromName } from "@/lib/environmentFromQuote";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type EnvSyncResult = {
  created: string[];
  linked: number;
};

/**
 * Cria ou vincula ambientes a partir de itens de orçamento aprovados.
 */
export async function upsertEnvironmentsFromApprovedItems(
  db: DbClient,
  projectId: string,
  items: Array<{ id: string; descricao: string | null }>
): Promise<EnvSyncResult> {
  const existingEnvs = await db.environment.findMany({
    where: { project_id: projectId },
    select: { id: true, nome: true, quote_item_id: true, status: true, fila_entrada_em: true },
  });
  const linkedItemIds = new Set(
    existingEnvs.map((e) => e.quote_item_id).filter((id): id is string => Boolean(id))
  );
  const existingNames = new Set(existingEnvs.map((e) => e.nome.trim().toLowerCase()));

  const created: string[] = [];
  let linked = 0;

  for (const item of items) {
    if (linkedItemIds.has(item.id)) continue;

    const nome = capitalizeText((item.descricao || "").trim());
    if (!nome) continue;

    const key = nome.toLowerCase();
    const reusable = existingEnvs.find(
      (e) => !e.quote_item_id && e.nome.trim().toLowerCase() === key
    );

    if (reusable) {
      await db.environment.update({
        where: { id: reusable.id },
        data: {
          quote_item_id: item.id,
          status: "PRONTO_PRODUCAO",
          ...(!reusable.fila_entrada_em ? { fila_entrada_em: new Date() } : {}),
        },
      });
      linkedItemIds.add(item.id);
      reusable.quote_item_id = item.id;
      linked += 1;
      continue;
    }

    if (existingNames.has(key)) {
      const uniqueNome = `${nome} (${item.id.slice(0, 4)})`;
      await db.environment.create({
        data: {
          project_id: projectId,
          nome: uniqueNome,
          tipo: inferEnvironmentTypeFromName(nome),
          status: "PRONTO_PRODUCAO",
          quote_item_id: item.id,
          fila_entrada_em: new Date(),
        },
      });
      existingNames.add(uniqueNome.toLowerCase());
      linkedItemIds.add(item.id);
      created.push(uniqueNome);
      continue;
    }

    await db.environment.create({
      data: {
        project_id: projectId,
        nome,
        tipo: inferEnvironmentTypeFromName(nome),
        status: "PRONTO_PRODUCAO",
        quote_item_id: item.id,
        fila_entrada_em: new Date(),
      },
    });
    existingNames.add(key);
    linkedItemIds.add(item.id);
    created.push(nome);
  }

  return { created, linked };
}

/** Garante ambientes para todos os itens APROVADO do projeto (idempotente). */
export async function ensureEnvironmentsFromApprovedQuotes(
  db: DbClient,
  projectId: string
): Promise<EnvSyncResult> {
  const approvedItems = await db.quoteItem.findMany({
    where: {
      status: "APROVADO",
      quote: { project_id: projectId },
    },
    select: { id: true, descricao: true },
  });

  if (approvedItems.length === 0) return { created: [], linked: 0 };
  return upsertEnvironmentsFromApprovedItems(db, projectId, approvedItems);
}
