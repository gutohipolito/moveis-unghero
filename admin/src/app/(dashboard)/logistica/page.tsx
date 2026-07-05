import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import { getCatalogItemsBySlug } from "@/app/actions/cadastros";
import LogisticaClient from "./LogisticaClient";
import PageHeader from "@/components/PageHeader";

// Dados Fictícios de Projetos Operacionais para Logística caso o banco esteja inacessível
const MOCK_OPERATIONAL_PROJECTS = [
  {
    id: "proj-5",
    valor_previsto: 95000.0,
    status_geral: "APROVADO",
    client: {
      id: "cli-5",
      nome: "Juliana Castro",
      cidade: "Farroupilha",
      telefone: "(54) 99555-4433",
      email: "juliana@email.com",
      observacoes: "[PJ - CNPJ: 12.345.678/0001-99]"
    }
  },
  {
    id: "proj-6",
    valor_previsto: 135000.0,
    status_geral: "PRODUCAO",
    client: {
      id: "cli-6",
      nome: "Geraldo Magela",
      cidade: "Garibaldi",
      telefone: "(54) 99122-3344",
      email: "geraldo@email.com",
    }
  },
  {
    id: "proj-7",
    valor_previsto: 85000.0,
    status_geral: "INSTALACAO",
    client: {
      id: "cli-7",
      nome: "Rodrigo Pinheiro",
      cidade: "Bento Gonçalves",
      telefone: "(54) 98111-2233",
      email: "rodrigo@email.com",
    }
  },
  {
    id: "proj-8",
    valor_previsto: 110000.0,
    status_geral: "FINALIZADO",
    client: {
      id: "cli-8",
      nome: "Patrícia Peixoto",
      cidade: "Caxias do Sul",
      telefone: "(54) 99912-3456",
      email: "patricia@email.com",
    }
  }
];

export default async function LogisticaPage() {
  const session = await getSessionSafe(await headers()).catch(() => null);
  const userCompanyId = session?.user?.company_id || "mock-company-id";

  let projects: any[] = [];
  let isMock = false;

  const isProduction = process.env.NODE_ENV === "production";

  if (isDatabaseOffline() && !isProduction) {
    projects = MOCK_OPERATIONAL_PROJECTS;
    isMock = true;
  } else {
    try {
      // Busca projetos que estão em andamento ou prontos (aprovados, produção, instalação, finalizados)
      projects = await prisma.project.findMany({
        where: {
          status_geral: {
            in: ["APROVADO", "PRODUCAO", "INSTALACAO", "FINALIZADO"]
          },
          client: {
            company_id: userCompanyId
          }
        },
        include: {
          client: true,
        }
      });

      if (projects.length === 0 && !isProduction) {
        projects = MOCK_OPERATIONAL_PROJECTS;
        isMock = true;
      }
    } catch (error) {
      console.warn("Conexão ao banco falhou no carregamento da Logística.");
      if (!isProduction) {
        setDatabaseOffline(true);
        projects = MOCK_OPERATIONAL_PROJECTS;
        isMock = true;
      } else {
        projects = [];
        isMock = false;
      }
    }
  }

  // Mapeamento simples
  const formattedProjects = projects.map(p => ({
    id: p.id,
    valor_previsto: Number(p.valor_previsto),
    status_geral: p.status_geral,
    client: {
      id: p.client.id,
      nome: p.client.nome,
      cidade: p.client.cidade,
      telefone: p.client.telefone,
      email: p.client.email,
      observacoes: p.client.observacoes
    }
  }));

  const veiculosRes = await getCatalogItemsBySlug(userCompanyId, "veiculos");
  const veiculos = veiculosRes.items.map((item) => ({
    id: item.id,
    label: item.label,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logística e Entrega"
        description="Planejamento de rotas de expedição, equipes de montagem e controle de qualidade técnica."
        badge={
          isMock ? (
            <span className="badge-meta px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
              Demonstração
            </span>
          ) : undefined
        }
      />

      <LogisticaClient initialProjects={formattedProjects} veiculos={veiculos} />
    </div>
  );
}
