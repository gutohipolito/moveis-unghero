import dynamic from "next/dynamic";
import { prisma } from "@/lib/prisma";
import { getSessionCompanyId } from "@/lib/session";
import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import { fetchFactoryBoard } from "@/lib/factoryBoard";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { maybeRedactForViewer } from "@/lib/viewerRedact";

const BiClient = dynamic(() => import("./BiClient"), {
  loading: () => (
    <div className="flex flex-1 min-h-[12rem] items-center justify-center rounded-xl border border-border/60 bg-card/40 text-sm text-muted-foreground">
      Carregando relatórios…
    </div>
  ),
});

export default async function BIPage() {
  await guardModule("bi");
  const userCompanyId = await getSessionCompanyId();

  let projects: Awaited<ReturnType<typeof loadBiProjects>> = [];
  let quotes: Awaited<ReturnType<typeof loadBiQuotes>> = [];
  let factoryEnvironments: any[] = [];
  try {
    const [pRes, qRes, fbRes] = await Promise.all([
      loadBiProjects(userCompanyId),
      loadBiQuotes(userCompanyId),
      fetchFactoryBoard(userCompanyId),
    ]);
    const auth = await getAuthContext();
    projects = maybeRedactForViewer(pRes, auth?.cargo);
    quotes = maybeRedactForViewer(qRes, auth?.cargo);
    factoryEnvironments = fbRes.environments;
  } catch (error) {
    console.warn("Falha ao se conectar com banco de dados no BI.", error);
  }

  return (
    <div className="md:h-[calc(100vh-var(--dashboard-chrome-offset))] md:flex md:flex-col md:overflow-hidden space-y-[var(--space-3)] print:p-0 print:h-auto print:overflow-visible">
      <div className="shrink-0 print:hidden">
        <PageHeader
          title="Relatórios"
          description="Análise e inteligência de mercado para a operação comercial da Móveis Unghero."
          help={
            <TooltipBody
              title="Inteligência comercial"
              items={[
                "Consolida projetos, valores e origem dos clientes em indicadores.",
                "Inclui resumo do funil (ativos, negociação e perdas) e de orçamentos.",
                "Analise desempenho por cidade, canal de origem e parceiros.",
                "Use os olhos do topo do painel para revelar valores (voltam a ocultar em 30s).",
              ]}
            />
          }
        />
      </div>

      <BiClient
        initialProjects={projects}
        initialQuotes={quotes}
        initialEnvironments={factoryEnvironments}
        companyId={userCompanyId}
      />
    </div>
  );
}

async function loadBiProjects(companyId: string) {
  const projects = await prisma.project.findMany({
    where: { client: { company_id: companyId } },
    select: {
      id: true,
      valor_previsto: true,
      status_geral: true,
      partner_id: true,
      partner: {
        select: {
          id: true,
          nome: true,
          cidade: true,
          tipo: true,
          fotoUrl: true,
        },
      },
      client: {
        select: {
          id: true,
          nome: true,
          cidade: true,
          origem: true,
          telefone: true,
          email: true,
        },
      },
    },
  });

  return projects.map((p) => ({
    id: p.id,
    valor_previsto: Number(p.valor_previsto),
    status_geral: p.status_geral,
    partner_id: p.partner_id,
    partner: p.partner,
    client: p.client,
  }));
}

async function loadBiQuotes(companyId: string) {
  const quotes = await prisma.quote.findMany({
    where: { project: { client: { company_id: companyId } } },
    select: {
      id: true,
      valor_final: true,
      validade: true,
      aprovado_em: true,
    },
  });

  return quotes.map((q) => ({
    id: q.id,
    valor_final: Number(q.valor_final),
    validade: q.validade.toISOString(),
    aprovado_em: q.aprovado_em ? q.aprovado_em.toISOString() : null,
  }));
}
