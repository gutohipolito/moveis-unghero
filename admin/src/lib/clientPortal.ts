import { prisma } from "@/lib/prisma";
import type { FileType, ProjectStatus } from "@prisma/client";

const CLIENT_VISIBLE_FILE_TYPES: FileType[] = ["RENDER", "CONTRATO", "FOTO"];

const FILE_TYPE_LABELS: Record<string, string> = {
  RENDER: "Render 3D",
  CONTRATO: "Contrato",
  FOTO: "Foto do projeto",
};

export interface ClientPortalProject {
  id: string;
  valor_previsto: number;
  status_geral: ProjectStatus;
  environments: Array<{
    id: string;
    nome: string;
    tipo: string;
    status: string;
  }>;
  files: Array<{
    id: string;
    tipo: string;
    nome_arquivo: string;
    url: string;
  }>;
  timeline: Array<{
    id: string;
    acao: string;
    data: string;
    autor?: string;
  }>;
  installments: Array<{
    id: string;
    valor: number;
    data_vencimento: string;
    data_pagamento: string | null;
    status: string;
    tipo: string;
  }>;
}

export interface ClientPortalData {
  id: string;
  nome: string;
  cidade: string;
  project: ClientPortalProject | null;
}

type ProjectWithRelations = {
  id: string;
  valor_previsto: { toString(): string } | number;
  status_geral: ProjectStatus;
  updatedAt: Date;
  environments: Array<{ id: string; nome: string; tipo: string; status: string }>;
  files: Array<{ id: string; tipo: FileType; url: string; versao: number }>;
  installments: Array<{
    id: string;
    valor: { toString(): string } | number;
    data_vencimento: Date;
    data_pagamento: Date | null;
    status: string;
    tipo: string;
  }>;
  timeline: Array<{
    id: string;
    acao: string;
    data: Date;
    user: { name: string };
  }>;
};

function pickClientPortalProject(projects: ProjectWithRelations[]) {
  if (projects.length === 0) return null;

  const sorted = [...projects].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  const active = sorted.find(
    (p) => p.status_geral !== "PERDIDO" && p.status_geral !== "FINALIZADO"
  );
  if (active) return active;

  const notLost = sorted.find((p) => p.status_geral !== "PERDIDO");
  return notLost ?? sorted[0];
}

function formatPortalProject(project: ProjectWithRelations): ClientPortalProject {
  return {
    id: project.id,
    valor_previsto: Number(project.valor_previsto),
    status_geral: project.status_geral,
    environments: project.environments.map((env) => ({
      id: env.id,
      nome: env.nome,
      tipo: env.tipo,
      status: env.status,
    })),
    files: project.files.map((file) => ({
      id: file.id,
      tipo: file.tipo,
      nome_arquivo: `${FILE_TYPE_LABELS[file.tipo] ?? file.tipo} (v${file.versao})`,
      url: file.url || "#",
    })),
    timeline: project.timeline.map((entry) => ({
      id: entry.id,
      acao: entry.acao,
      data: entry.data.toISOString(),
      autor: entry.user.name,
    })),
    installments: project.installments.map((ins) => ({
      id: ins.id,
      valor: Number(ins.valor),
      data_vencimento: ins.data_vencimento.toISOString(),
      data_pagamento: ins.data_pagamento?.toISOString() ?? null,
      status: ins.status,
      tipo: ins.tipo,
    })),
  };
}

export async function loadClientPortalData(
  clientId: string
): Promise<ClientPortalData | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        include: {
          environments: { orderBy: { nome: "asc" } },
          files: {
            where: { tipo: { in: CLIENT_VISIBLE_FILE_TYPES } },
            orderBy: { versao: "desc" },
          },
          installments: { orderBy: { data_vencimento: "asc" } },
          timeline: {
            where: { interno_sotamente: false },
            orderBy: { data: "desc" },
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!client) return null;

  const selectedProject = pickClientPortalProject(client.projects);

  return {
    id: client.id,
    nome: client.nome,
    cidade: client.cidade,
    project: selectedProject ? formatPortalProject(selectedProject) : null,
  };
}

/** Dados de demonstração para portal offline em desenvolvimento. */
export function getDevMockClientPortal(clientId: string): ClientPortalData | null {
  const mocks: Record<string, ClientPortalData> = {
    "cli-2": {
      id: "cli-2",
      nome: "Mariana Rezende",
      cidade: "Farroupilha",
      project: {
        id: "proj-2",
        valor_previsto: 78000,
        status_geral: "ORCAMENTO",
        environments: [
          { id: "env-3", nome: "Cozinha Integrada", tipo: "COZINHA", status: "EM_DETALHAMENTO" },
          { id: "env-4", nome: "Closet Master", tipo: "CLOSET", status: "AGUARDANDO_MEDICAO" },
        ],
        files: [
          {
            id: "file-2",
            tipo: "RENDER",
            nome_arquivo: "Render_Cozinha_Conceito_v1.jpg",
            url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
          },
        ],
        timeline: [
          {
            id: "time-3",
            acao: "Reunião de briefing inicial com a cliente e o arquiteto",
            data: new Date("2026-06-25T16:00:00Z").toISOString(),
            autor: "João (Vendedor)",
          },
        ],
        installments: [
          {
            id: "inst-4",
            valor: 39000,
            data_vencimento: new Date("2026-06-25").toISOString(),
            data_pagamento: new Date("2026-06-25").toISOString(),
            status: "PAGO",
            tipo: "ENTRADA",
          },
          {
            id: "inst-5",
            valor: 39000,
            data_vencimento: new Date("2026-07-25").toISOString(),
            data_pagamento: null,
            status: "PENDENTE",
            tipo: "PARCELA",
          },
        ],
      },
    },
    "cli-6": {
      id: "cli-6",
      nome: "Juliana Castro",
      cidade: "Farroupilha",
      project: {
        id: "proj-6",
        valor_previsto: 89000,
        status_geral: "PRODUCAO",
        environments: [
          { id: "env-6", nome: "Cozinha Americana", tipo: "COZINHA", status: "PRONTO_PRODUCAO" },
          { id: "env-7", nome: "Dormitório Infantil", tipo: "DORMITORIO", status: "EM_CORTE" },
        ],
        files: [
          {
            id: "file-4",
            tipo: "RENDER",
            nome_arquivo: "Render_Dormitorio_Final.png",
            url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
          },
        ],
        timeline: [
          {
            id: "time-5",
            acao: "Contrato assinado eletronicamente e liberado para fabricação",
            data: new Date("2026-06-15T18:00:00Z").toISOString(),
            autor: "João (Vendedor)",
          },
        ],
        installments: [
          {
            id: "inst-1",
            valor: 39000,
            data_vencimento: new Date("2026-06-15").toISOString(),
            data_pagamento: new Date("2026-06-15").toISOString(),
            status: "PAGO",
            tipo: "ENTRADA",
          },
          {
            id: "inst-2",
            valor: 25000,
            data_vencimento: new Date("2026-07-15").toISOString(),
            data_pagamento: null,
            status: "PENDENTE",
            tipo: "PARCELA",
          },
        ],
      },
    },
  };

  return mocks[clientId] ?? null;
}
