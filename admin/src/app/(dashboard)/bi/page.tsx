import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import BiClient from "./BiClient";
import PrivacyToggle from "@/components/PrivacyToggle";

// Dados Fictícios de Projetos para Mock caso o banco esteja inacessível
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
      observacoes: "[PF - CPF: 123.456.789-00]"
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
    valor_previsto: 95000.0,
    status_geral: "APROVADO",
    client: {
      id: "cli-5",
      nome: "Juliana Castro",
      cidade: "Farroupilha",
      origem: "INSTAGRAM",
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
      origem: "WHATSAPP",
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
      origem: "INDICACAO",
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
      origem: "INSTAGRAM",
      telefone: "(54) 99912-3456",
      email: "patricia@email.com",
    }
  }
];

export default async function BIPage() {
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

      if (projects.length === 0 && !isProduction) {
        projects = MOCK_PROJECTS;
        isMock = true;
      }
    } catch (error) {
      console.warn("Conexão ao banco falhou no carregamento do BI.");
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

  // Mapeamento simples
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-neutral-900">
              Relatórios & BI Executivo
            </h1>
            <PrivacyToggle />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Análise e inteligência de mercado para marcenaria de luxo da Móveis Unghero.
          </p>
        </div>
        {isMock && (
          <span className="self-start md:self-center text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full font-bold">
            Simulação de Dados (Offline)
          </span>
        )}
      </div>

      <BiClient initialProjects={formattedProjects} />
    </div>
  );
}
