import { prisma } from "@/lib/prisma";

/** Parceiro atribuído ao cliente (indicação /a/[code] ou CRM). */
export async function getClientPartnerId(clientId: string): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { partner_id: true },
  });
  return client?.partner_id ?? null;
}

/**
 * Campos para insert de Project herdando o parceiro do cliente.
 * Use em todo `prisma.project.create` / `tx.project.create`.
 */
export async function withInheritedPartnerId(
  clientId: string
): Promise<{ partner_id?: string }> {
  const partnerId = await getClientPartnerId(clientId);
  return partnerId ? { partner_id: partnerId } : {};
}

/**
 * Dentro de uma transação: lê partner_id do client já carregado ou busca no tx.
 */
export async function withInheritedPartnerIdTx(
  tx: { client: { findUnique: typeof prisma.client.findUnique } },
  clientId: string,
  knownPartnerId?: string | null
): Promise<{ partner_id?: string }> {
  if (knownPartnerId) return { partner_id: knownPartnerId };
  const client = await tx.client.findUnique({
    where: { id: clientId },
    select: { partner_id: true },
  });
  return client?.partner_id ? { partner_id: client.partner_id } : {};
}

/** Where clause: projeto do parceiro direto OU via cliente indicado. */
export function partnerOwnedProjectsWhere(partnerId: string) {
  return {
    OR: [{ partner_id: partnerId }, { client: { partner_id: partnerId } }],
  };
}

/**
 * Alinha Project.partner_id quando o cliente já tem parceiro e o projeto ainda não.
 * Só preenche null — nunca sobrescreve vínculo manual.
 */
export async function backfillProjectPartnerFromClients(partnerId: string): Promise<number> {
  const orphans = await prisma.project.findMany({
    where: {
      partner_id: null,
      client: { partner_id: partnerId },
    },
    select: { id: true },
  });
  if (orphans.length === 0) return 0;

  const result = await prisma.project.updateMany({
    where: {
      id: { in: orphans.map((p) => p.id) },
      partner_id: null,
    },
    data: { partner_id: partnerId },
  });
  return result.count;
}
