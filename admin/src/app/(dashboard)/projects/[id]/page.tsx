import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProjectDetails from "@/components/ProjectDetails";
import { redirect } from "next/navigation";

// Dados fictícios detalhados para caso o banco de dados esteja vazio ou inacessível
const MOCK_DETAILS: Record<string, any> = {
  "proj-1": {
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
      observacoes: "Cliente busca orçamento para cozinha sob medida e painel de TV para a sala. Prefere tons escuros e amadeirados."
    },
    environments: [
      { id: "env-1", nome: "Cozinha Planejada", tipo: "COZINHA", status: "AGUARDANDO_MEDICAO" },
      { id: "env-2", nome: "Home Theater Sala", tipo: "OUTROS", status: "AGUARDANDO_MEDICAO" }
    ],
    files: [
      { id: "file-1", tipo: "MEDICAO", url: "#", versao: 1, aprovado_producao: false, nome_arquivo: "Medicao_Bruta_Sala.pdf" }
    ],
    timeline: [
      { id: "time-1", acao: "Lead capturado via formulário do Instagram", data: new Date("2026-06-28T14:32:00Z"), interno_sotamente: false, user: { name: "Sistema" } },
      { id: "time-2", acao: "Primeiro contato telefônico. Cliente solicitou projeto preliminar.", data: new Date("2026-06-29T10:15:00Z"), interno_sotamente: true, user: { name: "João (Vendedor)" } }
    ],
    quotes: []
  },
  "proj-2": {
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
      observacoes: "Indicada pelo arquiteto Felipe. Projeto de alto padrão para apartamento novo inteiro."
    },
    environments: [
      { id: "env-3", nome: "Cozinha Integrada", tipo: "COZINHA", status: "EM_DETALHAMENTO" },
      { id: "env-4", nome: "Closet Master", tipo: "CLOSET", status: "AGUARDANDO_MEDICAO" },
      { id: "env-5", nome: "Móvel Lavabo", tipo: "BANHEIRO", status: "EM_DETALHAMENTO" }
    ],
    files: [
      { id: "file-2", tipo: "RENDER", url: "#", versao: 1, aprovado_producao: false, nome_arquivo: "Render_Cozinha_Conceito_v1.jpg" }
    ],
    timeline: [
      { id: "time-3", acao: "Reunião de briefing inicial com a cliente e o arquiteto", data: new Date("2026-06-25T16:00:00Z"), interno_sotamente: false, user: { name: "João (Vendedor)" } },
      { id: "time-4", acao: "Desenho das primeiras plantas no SketchUp iniciado", data: new Date("2026-06-27T09:00:00Z"), interno_sotamente: true, user: { name: "Lucas (Projetista)" } }
    ],
    quotes: [
      {
        id: "q-1",
        versao: 1,
        subtotal: 82000.0,
        desconto: 4000.0,
        valor_final: 78000.0,
        validade: new Date("2026-07-20T00:00:00Z"),
        observacoes: "Proposta preliminar em MDF Freijó e puxadores perfil bronze. Ferragens amortecidas standard."
      }
    ]
  },
  "proj-6": {
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
      observacoes: "Fechamento rápido. Exigência de prazo curto para a entrega da cozinha e dormitório infantil."
    },
    environments: [
      { id: "env-6", nome: "Cozinha Americana", tipo: "COZINHA", status: "PRONTO_PRODUCAO" },
      { id: "env-7", nome: "Dormitório Infantil", tipo: "DORMITORIO", status: "EM_CORTE" }
    ],
    files: [
      { id: "file-3", tipo: "PROJETO_TECNICO", url: "#", versao: 2, aprovado_producao: true, nome_arquivo: "Detalhamento_Cortes_Cozinha_v2.pdf" },
      { id: "file-4", tipo: "RENDER", url: "#", versao: 1, aprovado_producao: false, nome_arquivo: "Render_Dormitorio_Final.png" }
    ],
    timeline: [
      { id: "time-5", acao: "Contrato assinado eletronicamente", data: new Date("2026-06-15T18:00:00Z"), interno_sotamente: false, user: { name: "João (Vendedor)" } },
      { id: "time-6", acao: "Projeto técnico validado pelo engenheiro da fábrica", data: new Date("2026-06-20T11:00:00Z"), interno_sotamente: true, user: { name: "Carlos (Produção)" } },
      { id: "time-7", acao: "MDF Branco Tx e Freijó liberados para máquina de corte", data: new Date("2026-06-28T08:30:00Z"), interno_sotamente: true, user: { name: "Carlos (Produção)" } }
    ],
    quotes: [
      {
        id: "q-2",
        versao: 1,
        subtotal: 95000.0,
        desconto: 6000.0,
        valor_final: 89000.0,
        validade: new Date("2026-06-30T00:00:00Z"),
        observacoes: "Orçamento fechado e assinado. MDF e ferragens especiais inclusas."
      }
    ]
  }
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: RouteParams) {
  const { id } = await params;
  
  const session = await auth.api.getSession({
    headers: await headers()
  }).catch(() => null);

  const userCompanyId = session?.user?.company_id || "mock-company-id";

  let project = null;
  let isMock = false;

  try {
    // Tenta buscar o projeto completo do banco
    project = await prisma.project.findFirst({
      where: {
        id: id,
        client: {
          company_id: userCompanyId
        }
      },
      include: {
        client: true,
        environments: true,
        files: true,
        quotes: true,
        timeline: {
          include: {
            user: {
              select: { name: true }
            }
          },
          orderBy: {
            data: "desc"
          }
        }
      }
    });

    if (!project) {
      project = MOCK_DETAILS[id];
      isMock = true;
    }
  } catch (error) {
    console.warn("Falha de conexão com banco de dados na busca de detalhes do projeto, usando mocks.");
    project = MOCK_DETAILS[id];
    isMock = true;
  }

  // Se não houver projeto no banco nem nos mocks, cria um mock básico sob demanda
  if (!project) {
    project = {
      id: id,
      valor_previsto: 55000.0,
      status_geral: "LEAD",
      client: {
        id: "cli-generic",
        nome: "Cliente de Demonstração",
        cidade: "Bento Gonçalves",
        origem: "WHATSAPP",
        telefone: "(54) 99999-0000",
        email: "demo@email.com",
        observacoes: "Este projeto foi carregado dinamicamente para demonstração de rotas."
      },
      environments: [
        { id: "env-gen-1", nome: "Cozinha de Exemplo", tipo: "COZINHA", status: "AGUARDANDO_MEDICAO" }
      ],
      files: [],
      quotes: [],
      timeline: [
        { id: "time-gen-1", acao: "Projeto inicial gerado na rota dinamicamente", data: new Date(), interno_sotamente: false, user: { name: "Sistema" } }
      ]
    };
    isMock = true;
  }

  // Formata o projeto de forma segura
  const formattedProject = {
    id: project.id,
    valor_previsto: Number(project.valor_previsto),
    status_geral: project.status_geral,
    client: project.client,
    environments: project.environments.map((env: any) => ({
      id: env.id,
      nome: env.nome,
      tipo: env.tipo,
      status: env.status
    })),
    files: project.files.map((file: any) => ({
      id: file.id,
      tipo: file.tipo,
      url: file.url,
      versao: file.versao,
      aprovado_producao: file.aprovado_producao,
      nome_arquivo: file.nome_arquivo || `Arquivo_${file.tipo}_v${file.versao}.pdf`
    })),
    timeline: project.timeline.map((t: any) => ({
      id: t.id,
      acao: t.acao,
      data: t.data.toISOString ? t.data.toISOString() : new Date(t.data).toISOString(),
      interno_sotamente: t.interno_sotamente,
      user: t.user || { name: "Usuário do SaaS" }
    })),
    quotes: project.quotes?.map((q: any) => ({
      id: q.id,
      versao: q.versao,
      subtotal: Number(q.subtotal),
      desconto: Number(q.desconto),
      valor_final: Number(q.valor_final),
      validade: q.validade.toISOString ? q.validade.toISOString() : new Date(q.validade).toISOString(),
      observacoes: q.observacoes
    })) || []
  };

  return (
    <div className="space-y-6">
      <ProjectDetails 
        initialProject={formattedProject} 
        companyId={userCompanyId} 
        isMock={isMock} 
      />
    </div>
  );
}
