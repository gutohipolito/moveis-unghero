import { prisma } from "@/lib/prisma";
import type { PartnerType, ProjectStatus } from "@prisma/client";

export interface PartnerPortalProject {
  id: string;
  valor_previsto: number;
  status_geral: ProjectStatus;
  updatedAt: string;
  client: {
    nome: string;
    cidade: string;
  };
  environments: Array<{
    id: string;
    nome: string;
    tipo: string;
    status: string;
  }>;
}

export interface PartnerPortalData {
  id: string;
  nome: string;
  tipo: PartnerType;
  fotoUrl: string | null;
  cidade: string | null;
  escritorio: string | null;
  registro_profissional: string | null;
  portfolioUrl: string | null;
  projects: PartnerPortalProject[];
}

export async function loadPartnerPortalData(
  partnerId: string
): Promise<PartnerPortalData | null> {
  const partner = await prisma.professionalPartner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      nome: true,
      tipo: true,
      fotoUrl: true,
      cidade: true,
      escritorio: true,
      registro_profissional: true,
      portfolioUrl: true,
      ativo: true,
      projects: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          valor_previsto: true,
          status_geral: true,
          updatedAt: true,
          client: {
            select: {
              nome: true,
              cidade: true,
            },
          },
          environments: {
            orderBy: { nome: "asc" },
            select: {
              id: true,
              nome: true,
              tipo: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!partner || !partner.ativo) return null;

  return {
    id: partner.id,
    nome: partner.nome,
    tipo: partner.tipo,
    fotoUrl: partner.fotoUrl,
    cidade: partner.cidade,
    escritorio: partner.escritorio,
    registro_profissional: partner.registro_profissional,
    portfolioUrl: partner.portfolioUrl,
    projects: partner.projects.map((project) => ({
      id: project.id,
      valor_previsto: Number(project.valor_previsto),
      status_geral: project.status_geral,
      updatedAt: project.updatedAt.toISOString(),
      client: {
        nome: project.client.nome,
        cidade: project.client.cidade,
      },
      environments: project.environments.map((env) => ({
        id: env.id,
        nome: env.nome,
        tipo: env.tipo,
        status: env.status,
      })),
    })),
  };
}
