export const runtime = "edge";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClienteDashboardClient from "./ClienteDashboardClient";

// Mocks detalhados para exibição do cliente se o banco estiver vazio ou offline
const MOCK_CLIENT_PORTALS: Record<string, any> = {
  "cli-2": {
    id: "cli-2",
    nome: "Mariana Rezende",
    cidade: "Farroupilha",
    project: {
      id: "proj-2",
      valor_previsto: 78000.0,
      status_geral: "ORCAMENTO",
      environments: [
        { id: "env-3", nome: "Cozinha Integrada", tipo: "COZINHA", status: "EM_DETALHAMENTO" },
        { id: "env-4", nome: "Closet Master", tipo: "CLOSET", status: "AGUARDANDO_MEDICAO" },
        { id: "env-5", nome: "Móvel Lavabo", tipo: "BANHEIRO", status: "EM_DETALHAMENTO" }
      ],
      files: [
        { id: "file-2", tipo: "RENDER", url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80", versao: 1, nome_arquivo: "Render_Cozinha_Conceito_v1.jpg" }
      ],
      timeline: [
        { id: "time-3", acao: "Reunião de briefing inicial com a cliente e o arquiteto", data: new Date("2026-06-25T16:00:00Z"), interno_sotamente: false, user: { name: "João (Vendedor)" } }
      ],
      installments: [
        { id: "inst-4", valor: 39000.0, data_vencimento: new Date("2026-06-25"), data_pagamento: new Date("2026-06-25"), status: "PAGO", tipo: "ENTRADA" },
        { id: "inst-5", valor: 39000.0, data_vencimento: new Date("2026-07-25"), data_pagamento: null, status: "PENDENTE", tipo: "PARCELA" }
      ]
    }
  },
  "cli-6": {
    id: "cli-6",
    nome: "Juliana Castro",
    cidade: "Farroupilha",
    project: {
      id: "proj-6",
      valor_previsto: 89000.0,
      status_geral: "PRODUCAO",
      environments: [
        { id: "env-6", nome: "Cozinha Americana", tipo: "COZINHA", status: "PRONTO_PRODUCAO" },
        { id: "env-7", nome: "Dormitório Infantil", tipo: "DORMITORIO", status: "EM_CORTE" }
      ],
      files: [
        { id: "file-3", tipo: "PROJETO_TECNICO", url: "#", versao: 2, nome_arquivo: "Detalhamento_Cortes_Cozinha_v2.pdf" },
        { id: "file-4", tipo: "RENDER", url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80", versao: 1, nome_arquivo: "Render_Dormitorio_Final.png" }
      ],
      timeline: [
        { id: "time-5", acao: "Contrato assinado eletronicamente e liberado para fabricação", data: new Date("2026-06-15T18:00:00Z"), interno_sotamente: false, user: { name: "João (Vendedor)" } }
      ],
      installments: [
        { id: "inst-1", valor: 39000.0, data_vencimento: new Date("2026-06-15"), data_pagamento: new Date("2026-06-15"), status: "PAGO", tipo: "ENTRADA" },
        { id: "inst-2", valor: 25000.0, data_vencimento: new Date("2026-07-15"), data_pagamento: null, status: "PENDENTE", tipo: "PARCELA" },
        { id: "inst-3", valor: 25000.0, data_vencimento: new Date("2026-08-15"), data_pagamento: null, status: "PENDENTE", tipo: "PARCELA" }
      ]
    }
  }
};

export default async function ClienteDashboardPage() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("cliente-session")?.value;

  if (!clientId) {
    redirect("/cliente/login");
  }

  let client = null;
  let isMock = false;

  try {
    // Tenta buscar no banco o cliente e seu projeto
    client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          include: {
            environments: true,
            files: true,
            installments: true,
            timeline: {
              where: {
                interno_sotamente: false // Apenas eventos públicos!
              },
              orderBy: {
                data: "desc"
              }
            }
          }
        }
      }
    });

    // Adapta o formato para pegar o primeiro projeto ativo
    if (client && client.projects && client.projects.length > 0) {
      const p = client.projects[0];
      client = {
        id: client.id,
        nome: client.nome,
        cidade: client.cidade,
        project: {
          id: p.id,
          valor_previsto: Number(p.valor_previsto),
          status_geral: p.status_geral,
          environments: p.environments,
          files: p.files,
          timeline: p.timeline,
          installments: p.installments
        }
      };
    } else {
      client = MOCK_CLIENT_PORTALS[clientId];
      isMock = true;
    }
  } catch (error) {
    console.warn("Falha de conexão ao carregar portal do cliente. Carregando mock.");
    client = MOCK_CLIENT_PORTALS[clientId];
    isMock = true;
  }

  if (!client) {
    // Se não achar nada, desloga
    cookieStore.delete("cliente-session");
    redirect("/cliente/login");
  }

  // Prepara dados formatados e limpos
  const formattedClient = {
    id: client.id,
    nome: client.nome,
    cidade: client.cidade,
    project: client.project ? {
      id: client.project.id,
      valor_previsto: Number(client.project.valor_previsto),
      status_geral: client.project.status_geral,
      environments: client.project.environments.map((e: any) => ({
        id: e.id,
        nome: e.nome,
        tipo: e.tipo,
        status: e.status
      })),
      // Apenas arquivos relevantes para o cliente (renders de imagens e contratos de PDF, sem arquivos de medição bruta)
      files: client.project.files.map((file: any) => ({
        id: file.id,
        tipo: file.tipo,
        nome_arquivo: file.nome_arquivo || `${file.tipo}_Arquivo`,
        url: file.url || "#"
      })),
      timeline: client.project.timeline.map((t: any) => ({
        id: t.id,
        acao: t.acao,
        data: t.data.toISOString ? t.data.toISOString() : new Date(t.data).toISOString()
      })),
      installments: client.project.installments.map((ins: any) => ({
        id: ins.id,
        valor: Number(ins.valor),
        data_vencimento: ins.data_vencimento.toISOString ? ins.data_vencimento.toISOString() : new Date(ins.data_vencimento).toISOString(),
        data_pagamento: ins.data_pagamento ? (ins.data_pagamento.toISOString ? ins.data_pagamento.toISOString() : new Date(ins.data_pagamento).toISOString()) : null,
        status: ins.status,
        tipo: ins.tipo
      }))
    } : null
  };

  return (
    <ClienteDashboardClient client={formattedClient} isMock={isMock} />
  );
}
