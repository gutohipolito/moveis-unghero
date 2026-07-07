import { getColaboradores } from "@/app/actions/colaboradores";
import { getProjectSla, ensureProjectSla } from "@/app/actions/productionSla";
import ProjectDetails from "@/components/ProjectDetails";
import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import { notFound } from "next/navigation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: RouteParams) {
  const { id } = await params;
  const userCompanyId = await getSessionCompanyId();

  let project = null;
  try {
    project = await prisma.project.findFirst({
      where: {
        id,
        client: { company_id: userCompanyId },
      },
      include: {
        client: true,
        environments: true,
        files: true,
        quotes: true,
        tasks: true,
        installments: true,
        responsavel: true,
        briefing: true,
        timeline: {
          include: { user: { select: { name: true } } },
          orderBy: { data: "desc" },
        },
      },
    });
  } catch (error) {
    console.warn("Falha de conexão com banco de dados na busca de detalhes do projeto.", error);
  }

  if (!project) {
    notFound();
  }

  const colaboradoresRes = await getColaboradores(userCompanyId);
  const colaboradores =
    colaboradoresRes.success && colaboradoresRes.colaboradores
      ? colaboradoresRes.colaboradores.map((c: { id: string; name: string; cargo: string }) => ({
          id: c.id,
          name: c.name,
          cargo: c.cargo,
        }))
      : [];

  const formattedProject = {
    id: project.id,
    valor_previsto: Number(project.valor_previsto),
    status_geral: project.status_geral,
    client: project.client,
    data_entrega_prevista: project.data_entrega_prevista
      ? project.data_entrega_prevista.toISOString()
      : null,
    responsavel_id: project.responsavel_id || null,
    responsavelNome: project.responsavel?.name || null,
    observacoes: project.observacoes || "",
    environments: project.environments.map((env) => ({
      id: env.id,
      nome: env.nome,
      tipo: env.tipo,
      status: env.status,
    })),
    files: project.files.map((file) => ({
      id: file.id,
      tipo: file.tipo,
      url: file.url,
      versao: file.versao,
      aprovado_producao: file.aprovado_producao,
      nome_arquivo: `Arquivo_${file.tipo}_v${file.versao}.pdf`,
    })),
    timeline: project.timeline.map((t) => ({
      id: t.id,
      acao: t.acao,
      data: t.data.toISOString(),
      interno_sotamente: t.interno_sotamente,
      user: t.user || { name: "Usuário" },
    })),
    quotes: project.quotes.map((q) => ({
      id: q.id,
      versao: q.versao,
      subtotal: Number(q.subtotal),
      desconto: Number(q.desconto),
      valor_final: Number(q.valor_final),
      validade: q.validade.toISOString(),
      observacoes: q.observacoes,
    })),
    tasks: project.tasks.map((t) => ({
      id: t.id,
      titulo: t.titulo || "Compromisso",
      descricao: t.descricao || "",
      responsavel: t.responsavel,
      data: t.data.toISOString(),
      status: t.status,
      tipo: t.tipo || "OUTROS",
    })),
    installments: project.installments.map((ins) => ({
      id: ins.id,
      valor: Number(ins.valor),
      data_vencimento: ins.data_vencimento.toISOString(),
      data_pagamento: ins.data_pagamento ? ins.data_pagamento.toISOString() : null,
      status: ins.status,
      tipo: ins.tipo,
    })),
    briefing: project.briefing ? {
      id: project.briefing.id,
      ambientes: project.briefing.ambientes,
      tipo_imovel: project.briefing.tipo_imovel,
      fase_projeto: project.briefing.fase_projeto,
      pronto: project.briefing.pronto,
      data_chaves: project.briefing.data_chaves,
      tem_projeto: project.briefing.tem_projeto,
      estilo: project.briefing.estilo,
      faixa_investimento: project.briefing.faixa_investimento,
      prazo_inicio: project.briefing.prazo_inicio,
      pinterest_link: project.briefing.pinterest_link,
      referencia_url: project.briefing.referencia_url,
      origem_lead: project.briefing.origem_lead,
      score: project.briefing.score,
      roteiro_sugerido: project.briefing.roteiro_sugerido,
      createdAt: project.briefing.createdAt.toISOString()
    } : null
  };

  const hasProductionApproval = formattedProject.files.some((f) => f.aprovado_producao);
  let initialSla = null;
  if (hasProductionApproval) {
    await ensureProjectSla(id);
    initialSla = await getProjectSla(id);
  }

  return (
    <div className="space-y-6">
      <ProjectDetails
        initialProject={formattedProject as any}
        companyId={userCompanyId}
        colaboradores={colaboradores}
        isMock={false}
        initialSla={initialSla}
      />
    </div>
  );
}
