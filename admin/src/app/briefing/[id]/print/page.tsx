import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Layers, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  Laptop, 
  Clock, 
  Link as LinkIcon 
} from "lucide-react";
import { isOpsLimitedRole } from "@/lib/permissions";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintBriefingPage({ params }: PrintPageProps) {
  const { id } = await params;
  
  // Garantir acesso apenas a operadores autenticados
  const session = await getSessionSafe(await headers()).catch(() => null);
  if (!session?.user) {
    redirect("/login");
  }
  if (isOpsLimitedRole(session.user.cargo)) {
    redirect("/crm");
  }

  const briefing = await prisma.leadBriefing.findFirst({
    where: { 
      project_id: id,
      project: { client: { company_id: session.user.company_id } }
    },
    include: {
      project: {
        include: {
          client: true
        }
      }
    }
  });

  if (!briefing) {
    notFound();
  }

  const client = briefing.project.client;
  const ambientes = JSON.parse(briefing.ambientes) as { nome: string; opcao?: string }[];
  
  const score = briefing.score ?? 0;
  let classification = "Morno";
  let classBg = "bg-amber-100 text-amber-800 border-amber-200";
  if (score >= 80) {
    classification = "Quente";
    classBg = "bg-red-100 text-red-800 border-red-200";
  } else if (score < 50) {
    classification = "Frio";
    classBg = "bg-slate-100 text-slate-800 border-slate-200";
  }

  return (
    <div className="bg-slate-50 text-black min-h-screen font-sans print:bg-white p-4 md:p-8">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; color: black; }
          .print\\:hidden { display: none !important; }
          .print-card { border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important; }
          .page-break { page-break-before: always; }
        }
      `}} />

      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="print:hidden max-w-[800px] mx-auto mb-6 bg-slate-900 text-white p-4 flex items-center justify-between rounded-xl shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Impressão Comercial</span>
          <span className="text-xs text-slate-600">|</span>
          <span className="text-xs font-black text-white">Briefing de Qualificação</span>
        </div>
        <PrintButton />
      </div>

      <div className="max-w-[800px] mx-auto bg-white border border-slate-200 p-8 space-y-8 rounded-2xl shadow-xs print:border-none print:p-0 print:shadow-none print-card">
        {/* CABEÇALHO DO BRIEFING */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div className="space-y-1.5">
            <img src="/logo.png" alt="Móveis Unghero" className="h-10 w-auto object-contain filter brightness-0" />
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase pt-2">Ficha de Qualificação do Lead</h1>
            <p className="text-xs font-semibold text-slate-400">Briefing Técnico de Entrada • Móveis Sob Medida</p>
          </div>
          <div className="text-right space-y-1">
            <span className={`inline-block text-[10px] font-black tracking-wider px-3 py-1 rounded-md border uppercase ${classBg}`}>
              Lead {classification} ({score} pts)
            </span>
            <p className="text-[10px] text-slate-450 font-bold block pt-1">
              Data: {new Date(briefing.createdAt).toLocaleDateString("pt-BR")} às {new Date(briefing.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* DADOS CADASTRAIS DO CLIENTE */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" /> Identificação do Cliente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[9px]">Nome Completo</p>
              <p className="text-slate-800 font-bold text-sm">{client.nome}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[9px]">WhatsApp / Contato</p>
              <p className="text-slate-800 flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" /> {client.telefone}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[9px]">E-mail</p>
              <p className="text-slate-800 flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" /> {client.email || "Não informado"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[9px]">Localização do Imóvel</p>
              <p className="text-slate-800 flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {client.cidade}</p>
            </div>
          </div>
        </div>

        {/* METADADOS DO PREENCHIMENTO */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" /> Dados de Conversão & Canal
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[9px]">Origem Indicada</p>
              <p className="text-slate-850 uppercase">{briefing.origem_lead || "SITE"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[9px]">Dispositivo</p>
              <p className="text-slate-850 flex items-center gap-1"><Laptop className="h-3.5 w-3.5 text-slate-400" /> {briefing.dispositivo || "Desktop"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[9px]">Sistema Operacional</p>
              <p className="text-slate-850">{briefing.os || "Desconhecido"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase text-[9px]">Tempo de Resposta</p>
              <p className="text-slate-850 flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" /> {briefing.tempo_preenchimento ? `${briefing.tempo_preenchimento}s` : "Não registrado"}</p>
            </div>
          </div>
        </div>

        {/* SCRIPTS E ROTEIRO COMERCIAL */}
        {briefing.roteiro_sugerido && (
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-amber-500 shrink-0" /> Diretrizes de Abordagem Comercial (IA)
            </h3>
            <div className="text-xs text-slate-700 leading-relaxed space-y-2 font-medium">
              {briefing.roteiro_sugerido.split("\n").map((line, idx) => {
                if (line.startsWith("###")) return null;
                const isBullet = line.startsWith("*") || line.startsWith("-");
                return (
                  <p key={idx} className={isBullet ? "pl-3 border-l-2 border-primary/45 py-0.5" : ""}>
                    {line.replace(/^[\*\-\s]+/, "")}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* DETALHAMENTO DO PROJETO */}
        <div className="space-y-3 page-break">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-400" /> Respostas Gerais sobre o Projeto
          </h3>
          <table className="w-full text-xs font-semibold text-slate-750">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-400 font-bold uppercase w-1/3">Tipo do Imóvel</td>
                <td className="py-2.5 text-slate-850">{briefing.tipo_imovel}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-400 font-bold uppercase w-1/3">Fase Atual</td>
                <td className="py-2.5 text-slate-850">{briefing.fase_projeto}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-400 font-bold uppercase w-1/3">Situação do Imóvel</td>
                <td className="py-2.5 text-slate-850">
                  {briefing.pronto}
                  {briefing.data_chaves && <span className="text-slate-450 block text-[10px] font-bold">Chaves previstas para: {briefing.data_chaves}</span>}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-400 font-bold uppercase w-1/3">Possui Projeto Técnico?</td>
                <td className="py-2.5 text-slate-850">{briefing.tem_projeto}</td>
              </tr>
              {briefing.estilo && (
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-400 font-bold uppercase w-1/3">Estilo Estético Escolhido</td>
                  <td className="py-2.5 text-slate-850">{briefing.estilo}</td>
                </tr>
              )}
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-400 font-bold uppercase w-1/3">Orçamento de Investimento</td>
                <td className="py-2.5 text-slate-850">{briefing.faixa_investimento || "Prefiro conversar"}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-400 font-bold uppercase w-1/3">Prazo Pretendido</td>
                <td className="py-2.5 text-slate-850">{briefing.prazo_inicio}</td>
              </tr>
              {(briefing.pinterest_link || briefing.referencia_url) && (
                <tr>
                  <td className="py-2.5 text-slate-400 font-bold uppercase w-1/3">Materiais / Referências</td>
                  <td className="py-2.5 text-slate-850 space-y-1">
                    {briefing.pinterest_link && (
                      <a href={briefing.pinterest_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <LinkIcon className="h-3 w-3" /> Painel de Referências (Pinterest)
                      </a>
                    )}
                    {briefing.referencia_url && (
                      <a href={briefing.referencia_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <LinkIcon className="h-3 w-3" /> Planta ou Documento Anexo
                      </a>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* DETALHAMENTO POR AMBIENTES */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-400" /> Ambientes Desejados ({ambientes.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
            {ambientes.map((amb) => (
              <div key={amb.nome} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                <p className="text-slate-800 font-black">{amb.nome}</p>
                {amb.opcao && (
                  <p className="text-[10px] text-slate-450 font-bold uppercase">
                    Especificação: <span className="text-slate-650">{amb.opcao}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* OBSERVAÇÕES ADICIONAIS */}
        {briefing.project.observacoes && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-1">Observações Adicionais</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              {briefing.project.observacoes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
