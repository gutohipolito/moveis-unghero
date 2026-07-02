import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import AgendaClient from "./AgendaClient";

// Mock de dados para agenda técnica
const MOCK_EVENTS = [
  {
    id: "evt-1",
    titulo: "Medição Técnica do Closets",
    descricao: "Confirmar medidas exatas das tomadas no Closet Master e alturas dos cabideiros.",
    responsavel: "Lucas (Projetista)",
    data: new Date("2026-07-06T10:00:00Z").toISOString(),
    status: "PENDENTE",
    tipo: "MEDICAO_TECNICA",
    project: {
      id: "proj-2",
      client: {
        nome: "Mariana Rezende"
      }
    }
  },
  {
    id: "evt-2",
    titulo: "Entrega de Módulos da Cozinha",
    descricao: "Descarregar módulos e ferragens especiais Blum. Necessário ajudante técnico.",
    responsavel: "Carlos (Produção)",
    data: new Date("2026-07-15T08:00:00Z").toISOString(),
    status: "PENDENTE",
    tipo: "ENTREGA_MOVEIS",
    project: {
      id: "proj-6",
      client: {
        nome: "Juliana Castro"
      }
    }
  },
  {
    id: "evt-3",
    titulo: "Instalação Fita de LED e Fina Marcenaria",
    descricao: "Ajustes de portas Lacca e instalação das fitas LED embutidas.",
    responsavel: "Roberto (Montador)",
    data: new Date("2026-07-17T13:30:00Z").toISOString(),
    status: "PENDENTE",
    tipo: "INSTALACAO",
    project: {
      id: "proj-6",
      client: {
        nome: "Juliana Castro"
      }
    }
  },
  {
    id: "evt-4",
    titulo: "Briefing de Novo Projeto",
    descricao: "Primeira visita técnica comercial no local para fotografias e medidas brutas da sala.",
    responsavel: "João (Vendedor)",
    data: new Date("2026-07-03T15:00:00Z").toISOString(),
    status: "CONCLUIDA",
    tipo: "VISITA_COMERCIAL",
    project: {
      id: "proj-1",
      client: {
        nome: "Renato Silveira"
      }
    }
  }
];

const MOCK_PROJECTS = [
  { id: "proj-1", client: { nome: "Renato Silveira" } },
  { id: "proj-2", client: { nome: "Mariana Rezende" } },
  { id: "proj-6", client: { nome: "Juliana Castro" } }
];

export default async function AgendaPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  }).catch(() => null);

  const userCompanyId = session?.user?.company_id || "mock-company-id";

  let tasks = [];
  let projects = [];
  let isMock = false;

  if (isDatabaseOffline()) {
    tasks = MOCK_EVENTS;
    projects = MOCK_PROJECTS;
    isMock = true;
  } else {
    try {
      // Tenta buscar as tarefas do banco com relações
      tasks = await prisma.task.findMany({
        where: {
          project: {
            client: {
              company_id: userCompanyId
            }
          }
        },
        include: {
          project: {
            include: {
              client: true
            }
          }
        },
        orderBy: {
          data: "asc"
        }
      });

      projects = await prisma.project.findMany({
        where: {
          client: {
            company_id: userCompanyId
          }
        },
        include: {
          client: true
        }
      });

      if (tasks.length === 0) {
        tasks = MOCK_EVENTS;
        isMock = true;
      }
      if (projects.length === 0) {
        projects = MOCK_PROJECTS;
      }
    } catch (error) {
      console.warn("Falha de conexão com banco de dados na busca da agenda. Usando mocks.");
      setDatabaseOffline(true);
      tasks = MOCK_EVENTS;
      projects = MOCK_PROJECTS;
      isMock = true;
    }
  }

  // Formata dados seguros
  const formattedEvents = tasks.map((t: any) => ({
    id: t.id,
    titulo: t.titulo || "Compromisso Técnico",
    descricao: t.descricao || "",
    responsavel: t.responsavel,
    data: t.data.toISOString ? t.data.toISOString() : new Date(t.data).toISOString(),
    status: t.status,
    tipo: t.tipo || "OUTROS",
    projectName: t.project?.client?.nome || "Sem Projeto Associado",
    projectId: t.project?.id || ""
  }));

  const formattedProjects = projects.map((p: any) => ({
    id: p.id,
    clientName: p.client.nome
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient-gold">
            Agenda Técnica & Compromissos
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie visitas comerciais, medições físicas, entregas e instalações de marcenaria fina.
          </p>
        </div>
        {isMock && (
          <span className="self-start text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded font-semibold tracking-wide uppercase">
            Dados de Demonstração
          </span>
        )}
      </div>

      <AgendaClient 
        initialEvents={formattedEvents} 
        projects={formattedProjects} 
      />
    </div>
  );
}
