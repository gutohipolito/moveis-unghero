import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import { getClients } from "@/app/actions/cliente";
import KanbanBoard from "@/components/KanbanBoard";
import PrivacyToggle from "@/components/PrivacyToggle";

// Lista de Leads/Projetos Fictícios para Mock caso o banco esteja vazio ou inacessível
const MOCK_PROJECTS = [
  {
    id: "proj-1",
    valor_previsto: 45000.0,
    status_geral: "LEAD",
    client: {
      id: "cli-1",
      nome: "Renato Silveira",
      cidade: "Caxias do Sul",
      origem: "INSTAGRAM",
      telefone: "(54) 99876-5432",
      email: "renato@email.com",
    }
  },
  {
    id: "proj-2",
    valor_previsto: 78000.0,
    status_geral: "ORCAMENTO",
    client: {
      id: "cli-2",
      nome: "Mariana Rezende",
      cidade: "Farroupilha",
      origem: "INDICACAO",
      telefone: "(54) 99123-4567",
      email: "mariana@email.com",
    }
  },
  {
    id: "proj-3",
    valor_previsto: 120000.0,
    status_geral: "NEGOCIACAO",
    client: {
      id: "cli-3",
      nome: "Carlos Eduardo Costa",
      cidade: "Bento Gonçalves",
      origem: "SITE",
      telefone: "(54) 98888-2233",
      email: "carlos@email.com",
    }
  },
  {
    id: "proj-4",
    valor_previsto: 62000.0,
    status_geral: "CONFERENCIA_TECNICA",
    client: {
      id: "cli-4",
      nome: "Cláudia & Fernando",
      cidade: "Caxias do Sul",
      origem: "GOOGLE",
      telefone: "(54) 99900-1122",
      email: "claudia@email.com",
    }
  },
  {
    id: "proj-5",
    valor_previsto: 35000.0,
    status_geral: "APROVADO",
    client: {
      id: "cli-5",
      nome: "Roberto Mendes",
      cidade: "Flores da Cunha",
      origem: "WHATSAPP",
      telefone: "(54) 99234-8899",
      email: "roberto@email.com",
    }
  },
  {
    id: "proj-6",
    valor_previsto: 89000.0,
    status_geral: "PRODUCAO",
    client: {
      id: "cli-6",
      nome: "Juliana Castro",
      cidade: "Farroupilha",
      origem: "INSTAGRAM",
      telefone: "(54) 99555-4433",
      email: "juliana@email.com",
    }
  },
  {
    id: "proj-7",
    valor_previsto: 55000.0,
    status_geral: "INSTALACAO",
    client: {
      id: "cli-7",
      nome: "Lúcia Albuquerque",
      cidade: "Caxias do Sul",
      origem: "INDICACAO",
      telefone: "(54) 98111-9988",
      email: "lucia@email.com",
    }
  }
];

export default async function CRMPage() {
  const session = await getSessionSafe(await headers()).catch(() => null);

  const userCompanyId = session?.user?.company_id || "mock-company-id";

  let projects: any[] = [];
  let isMock = false;

  const isProduction = process.env.NODE_ENV === "production";

  if (isDatabaseOffline() && !isProduction) {
    projects = MOCK_PROJECTS;
    isMock = true;
  } else {
    try {
      // Tenta buscar os projetos do banco de dados vinculados à empresa do usuário
      projects = await prisma.project.findMany({
        where: {
          client: {
            company_id: userCompanyId
          }
        },
        include: {
          client: true,
        }
      });

      // Se a busca der certo mas o banco estiver vazio, usa os mocks para visualização (apenas fora de produção)
      if (projects.length === 0 && !isProduction) {
        projects = MOCK_PROJECTS;
        isMock = true;
      }
    } catch (error) {
      console.warn("Conexão ao banco falhou no carregamento do CRM.");
      if (!isProduction) {
        setDatabaseOffline(true);
        projects = MOCK_PROJECTS;
        isMock = true;
      } else {
        projects = [];
        isMock = false;
      }
    }
  }

  // Mapeia os dados do Prisma para o formato JSON simples para o client component
  const formattedProjects = projects.map(p => ({
    id: p.id,
    valor_previsto: Number(p.valor_previsto),
    status_geral: p.status_geral,
    client: {
      id: p.client.id,
      nome: p.client.nome,
      cidade: p.client.cidade,
      origem: p.client.origem,
      telefone: p.client.telefone,
      email: p.client.email,
    }
  }));

  const clientResponse = await getClients(userCompanyId);
  const clientsList = clientResponse.success ? clientResponse.clients : [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
              Pipeline de Vendas (CRM)
            </h1>
            <PrivacyToggle />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isMock 
              ? "Modo Demonstração: Exibindo projetos simulados da Móveis Unghero."
              : "Gerencie as etapas de negociação e fabricação dos móveis sob medida."}
          </p>
        </div>
      </div>

      {/* Board Kanban Interativo */}
      <KanbanBoard 
        initialProjects={formattedProjects} 
        companyId={userCompanyId} 
        clients={clientsList as any} 
      />
    </div>
  );
}
