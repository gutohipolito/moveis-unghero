"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { canManageClients, isOpsLimitedRole } from "@/lib/permissions";
import { capitalizeText } from "@/lib/utils";

export type ClientContactDTO = {
  id: string;
  client_id: string;
  nome: string;
  area: string | null;
  telefone: string | null;
  email: string | null;
  principal: boolean;
  createdAt: string;
};

function mapContact(row: {
  id: string;
  client_id: string;
  nome: string;
  area: string | null;
  telefone: string | null;
  email: string | null;
  principal: boolean;
  createdAt: Date;
}): ClientContactDTO {
  return {
    id: row.id,
    client_id: row.client_id,
    nome: row.nome,
    area: row.area,
    telefone: row.telefone,
    email: row.email,
    principal: row.principal,
    createdAt: row.createdAt.toISOString(),
  };
}

async function requirePjClient(clientId: string, companyId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, company_id: companyId },
    select: { id: true, tipo_pessoa: true },
  });
  if (!client) return { error: "Cliente não encontrado." as const };
  if (client.tipo_pessoa !== "PJ") {
    return { error: "Representantes só estão disponíveis para clientes PJ (CNPJ)." as const };
  }
  return { client };
}

export async function listClientContacts(clientId: string) {
  const auth = await getModuleAccess("clientes");
  if (!auth) {
    return { success: false as const, error: "Não autenticado.", contacts: [] as ClientContactDTO[] };
  }
  if (isOpsLimitedRole(auth.cargo)) {
    return { success: false as const, error: "Sem permissão.", contacts: [] as ClientContactDTO[] };
  }

  const check = await requirePjClient(clientId, auth.companyId);
  if ("error" in check && check.error) {
    return { success: false as const, error: check.error, contacts: [] as ClientContactDTO[] };
  }

  const rows = await prisma.clientContact.findMany({
    where: { client_id: clientId },
    orderBy: [{ principal: "desc" }, { nome: "asc" }],
  });

  return { success: true as const, contacts: rows.map(mapContact) };
}

export async function createClientContact(input: {
  clientId: string;
  nome: string;
  area?: string | null;
  telefone?: string | null;
  email?: string | null;
  principal?: boolean;
}) {
  const auth = await getWriteAccess("clientes");
  if (!auth || !canManageClients(auth.cargo)) {
    return { success: false as const, error: "Sem permissão para cadastrar representantes." };
  }

  const check = await requirePjClient(input.clientId, auth.companyId);
  if ("error" in check && check.error) {
    return { success: false as const, error: check.error };
  }

  const nome = capitalizeText(input.nome.trim());
  if (!nome) return { success: false as const, error: "Informe o nome do representante." };

  const email = (input.email || "").trim().toLowerCase() || null;
  const telefone = (input.telefone || "").trim() || null;
  const area = (input.area || "").trim() || null;
  const makePrincipal = Boolean(input.principal);

  const contact = await prisma.$transaction(async (tx) => {
    if (makePrincipal) {
      await tx.clientContact.updateMany({
        where: { client_id: input.clientId, principal: true },
        data: { principal: false },
      });
    }
    const count = await tx.clientContact.count({ where: { client_id: input.clientId } });
    return tx.clientContact.create({
      data: {
        client_id: input.clientId,
        nome,
        area,
        telefone,
        email,
        principal: makePrincipal || count === 0,
      },
    });
  });

  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/clientes");
  return { success: true as const, contact: mapContact(contact) };
}

export async function updateClientContact(input: {
  id: string;
  nome?: string;
  area?: string | null;
  telefone?: string | null;
  email?: string | null;
  principal?: boolean;
}) {
  const auth = await getWriteAccess("clientes");
  if (!auth || !canManageClients(auth.cargo)) {
    return { success: false as const, error: "Sem permissão." };
  }

  const existing = await prisma.clientContact.findFirst({
    where: { id: input.id, client: { company_id: auth.companyId } },
    include: { client: { select: { id: true, tipo_pessoa: true } } },
  });
  if (!existing) return { success: false as const, error: "Representante não encontrado." };
  if (existing.client.tipo_pessoa !== "PJ") {
    return { success: false as const, error: "Representantes só para clientes PJ." };
  }

  const data: {
    nome?: string;
    area?: string | null;
    telefone?: string | null;
    email?: string | null;
    principal?: boolean;
  } = {};

  if (input.nome !== undefined) {
    const nome = capitalizeText(input.nome.trim());
    if (!nome) return { success: false as const, error: "Informe o nome do representante." };
    data.nome = nome;
  }
  if (input.area !== undefined) data.area = (input.area || "").trim() || null;
  if (input.telefone !== undefined) data.telefone = (input.telefone || "").trim() || null;
  if (input.email !== undefined) {
    data.email = (input.email || "").trim().toLowerCase() || null;
  }

  const contact = await prisma.$transaction(async (tx) => {
    if (input.principal === true) {
      await tx.clientContact.updateMany({
        where: { client_id: existing.client_id, principal: true, id: { not: existing.id } },
        data: { principal: false },
      });
      data.principal = true;
    } else if (input.principal === false) {
      data.principal = false;
    }
    return tx.clientContact.update({ where: { id: existing.id }, data });
  });

  revalidatePath(`/clientes/${existing.client_id}`);
  return { success: true as const, contact: mapContact(contact) };
}

export async function deleteClientContact(id: string) {
  const auth = await getWriteAccess("clientes");
  if (!auth || !canManageClients(auth.cargo)) {
    return { success: false as const, error: "Sem permissão." };
  }

  const existing = await prisma.clientContact.findFirst({
    where: { id, client: { company_id: auth.companyId } },
    select: { id: true, client_id: true, principal: true },
  });
  if (!existing) return { success: false as const, error: "Representante não encontrado." };

  await prisma.$transaction(async (tx) => {
    await tx.clientContact.delete({ where: { id: existing.id } });
    if (existing.principal) {
      const next = await tx.clientContact.findFirst({
        where: { client_id: existing.client_id },
        orderBy: { nome: "asc" },
      });
      if (next) {
        await tx.clientContact.update({
          where: { id: next.id },
          data: { principal: true },
        });
      }
    }
  });

  revalidatePath(`/clientes/${existing.client_id}`);
  return { success: true as const };
}

export async function setPrincipalClientContact(id: string) {
  return updateClientContact({ id, principal: true });
}
