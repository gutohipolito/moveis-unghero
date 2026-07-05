import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import { getColaboradores } from "@/app/actions/colaboradores";
import FactoryClient from "./FactoryClient";
import PageHeader from "@/components/PageHeader";

// Mock de dados para cômodos na fábrica
const MOCK_ENVIRONMENTS = [
  {
    id: "env-f-1",
    nome: "Cozinha Americana Americana",
    tipo: "COZINHA",
    status: "EM_CORTE",
    project: {
      id: "proj-6",
      client: {
        nome: "Juliana Castro"
      }
    }
  },
  {
    id: "env-f-2",
    nome: "Dormitório Infantil Planejado",
    tipo: "DORMITORIO",
    status: "PRONTO_PRODUCAO",
    project: {
      id: "proj-6",
      client: {
        nome: "Juliana Castro"
      }
    }
  },
  {
    id: "env-f-3",
    nome: "Cozinha Conceito Premium",
    tipo: "COZINHA",
    status: "MONTAGEM_FABRICA",
    project: {
      id: "proj-2",
      client: {
        nome: "Mariana Rezende"
      }
    }
  },
  {
    id: "env-f-4",
    nome: "Móvel Lavabo Nobre",
    tipo: "BANHEIRO",
    status: "PRONTO_ENTREGA",
    project: {
      id: "proj-2",
      client: {
        nome: "Mariana Rezende"
      }
    }
  },
  {
    id: "env-f-5",
    nome: "Closet Casal Master",
    tipo: "CLOSET",
    status: "PRONTO_PRODUCAO",
    project: {
      id: "proj-2",
      client: {
        nome: "Mariana Rezende"
      }
    }
  }
];

export default async function FactoryPage() {
  const session = await getSessionSafe(await headers()).catch(() => null);

  const userCompanyId = session?.user?.company_id || "mock-company-id";

  // Busca os colaboradores cadastrados na empresa
  const colaboradoresRes = await getColaboradores(userCompanyId);
  const colaboradores = colaboradoresRes.success && colaboradoresRes.colaboradores ? colaboradoresRes.colaboradores.map((c: any) => ({
    id: c.id,
    name: c.name,
    cargo: c.cargo
  })) : [];

  let environments: any[] = [];
  let isMock = false;

  const isProduction = process.env.NODE_ENV === "production";

  if (isDatabaseOffline() && !isProduction) {
    environments = MOCK_ENVIRONMENTS;
    isMock = true;
  } else {
    try {
      // Tenta buscar no banco os ambientes cujos projetos tenham arquivos com aprovado_producao = true
      environments = await prisma.environment.findMany({
        where: {
          project: {
            client: {
              company_id: userCompanyId
            },
            files: {
              some: {
                aprovado_producao: true
              }
            }
          }
        },
        include: {
          project: {
            include: {
              client: true
            }
          },
          responsavel: true,
          ajudante: true
        }
      });

      if (environments.length === 0 && !isProduction) {
        environments = MOCK_ENVIRONMENTS;
        isMock = true;
      }
    } catch (error) {
      console.warn("Falha de conexão com banco de dados no chão de fábrica.");
      if (!isProduction) {
        setDatabaseOffline(true);
        environments = MOCK_ENVIRONMENTS;
        isMock = true;
      } else {
        environments = [];
        isMock = false;
      }
    }
  }

  // Formata os dados seguros
  const formattedEnvs = environments.map((e: any) => ({
    id: e.id,
    nome: e.nome,
    tipo: e.tipo,
    status: e.status,
    projectId: e.project?.id || "",
    clientName: e.project?.client?.nome || "Cliente avulso",
    responsavelId: e.responsavel_id || null,
    responsavelNome: e.responsavel?.name || null,
    ajudanteId: e.ajudante_id || null,
    ajudanteNome: e.ajudante?.name || null
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chão de Fábrica"
        description="Acompanhe em tempo real as etapas de fabricação e montagem dos cômodos liberados para produção."
        badge={
          isMock ? (
            <span className="badge-meta px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
              Demonstração
            </span>
          ) : undefined
        }
      />

      <FactoryClient initialEnvironments={formattedEnvs} colaboradores={colaboradores} />
    </div>
  );
}
