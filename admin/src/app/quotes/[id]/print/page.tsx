import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Printer, Sparkles } from "lucide-react";

// Mock para fallback caso o banco esteja indisponível ou orçamento não exista
const MOCK_QUOTES: Record<string, any> = {
  "q-1": {
    id: "q-1",
    versao: 1,
    subtotal: 82000.0,
    desconto: 4000.0,
    valor_final: 78000.0,
    validade: new Date("2026-07-20T00:00:00Z"),
    observacoes: "Mdf Lacca e texturas especiais com corrediças invisíveis e amortecimento Blum. Detalhes em vidro Reflecta e iluminação em fitas de LED embutidas. Garantia estendida de 10 anos da Móveis Unghero. Montagem com equipe própria especializada.",
    project: {
      client: {
        nome: "Mariana Rezende",
        cidade: "Farroupilha",
        telefone: "(54) 99123-4567",
        email: "mariana@email.com"
      }
    },
    items: [
      { descricao: "Móveis planejados em MDF Lacca e texturas amadeiradas nobres", quantidade: 1, tipo_custo: "MOVEIS_MDF", valor_unitario: 52000, valor_total: 52000 },
      { descricao: "Ferragens de alta tecnologia invisíveis com amortecedores Blum/Hettich", quantidade: 1, tipo_custo: "FERRAGENS_ESPECIAIS", valor_unitario: 12000, valor_total: 12000 },
      { descricao: "Fitas de LED de alto brilho embutidas em perfis de alumínio com sensores de toque", quantidade: 1, tipo_custo: "OUTROS", valor_unitario: 3500, valor_total: 3500 },
      { descricao: "Mão de obra qualificada para projeto técnico detalhado e montagem fina", quantidade: 1, tipo_custo: "MAO_DE_OBRA", valor_unitario: 8000, valor_total: 8000 }
    ]
  },
  "q-2": {
    id: "q-2",
    versao: 1,
    subtotal: 95000.0,
    desconto: 6000.0,
    valor_final: 89000.0,
    validade: new Date("2026-06-30T00:00:00Z"),
    observacoes: "Mdf Lacca e texturas especiais com corrediças invisíveis e amortecimento Blum. Detalhes em vidro Reflecta e iluminação em fitas de LED embutidas. Garantia estendida de 10 anos da Móveis Unghero. Montagem com equipe própria especializada.",
    project: {
      client: {
        nome: "Juliana Castro",
        cidade: "Farroupilha",
        telefone: "(54) 99555-4433",
        email: "juliana@email.com"
      }
    },
    items: [
      { descricao: "Móveis planejados em MDF Lacca e texturas amadeiradas nobres", quantidade: 1, tipo_custo: "MOVEIS_MDF", valor_unitario: 52000, valor_total: 52000 },
      { descricao: "Ferragens de alta tecnologia invisíveis com amortecedores Blum/Hettich", quantidade: 1, tipo_custo: "FERRAGENS_ESPECIAIS", valor_unitario: 12000, valor_total: 12000 },
      { descricao: "Fitas de LED de alto brilho embutidas em perfis de alumínio com sensores de toque", quantidade: 1, tipo_custo: "OUTROS", valor_unitario: 3500, valor_total: 3500 },
      { descricao: "Mão de obra qualificada para projeto técnico detalhado e montagem fina", quantidade: 1, tipo_custo: "MAO_DE_OBRA", valor_unitario: 8000, valor_total: 8000 }
    ]
  }
};

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

// Componentes padrões para o cabeçalho e rodapé do PDF comercial
function PrintHeader({ pageNum, title }: { pageNum: string; title: string }) {
  return (
    <div className="w-full flex items-center justify-between border-b-2 border-amber-500/20 pb-3 mb-6">
      <div className="flex items-center gap-3 animate-in fade-in duration-300">
        <span className="text-[9px] font-black text-amber-700 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 tracking-widest">
          PÁGINA {pageNum}
        </span>
        <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-widest">
          {title}
        </h4>
      </div>
      <img 
        src="/logo.png" 
        alt="Móveis Unghero" 
        className="h-6 w-auto object-contain opacity-80"
        style={{ filter: "sepia(1) saturate(1.5) hue-rotate(340deg) brightness(0.6)" }}
      />
    </div>
  );
}

function PrintFooter({ version }: { version: number }) {
  return (
    <div className="w-full border-t border-neutral-100 pt-3 mt-6 flex justify-between items-center text-[9px] text-neutral-400 font-medium">
      <div>
        <strong>Móveis Unghero LTDA</strong> — CNPJ: 12.345.678/0001-90
      </div>
      <div>
        Proposta Comercial v{version} — unghero.com.br
      </div>
    </div>
  );
}

export default async function PrintQuotePage({ params }: PrintPageProps) {
  const { id } = await params;
  
  let quote = null;
  let isMock = false;

  try {
    // Busca do banco
    quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: true,
        project: {
          include: {
            client: true
          }
        }
      }
    });

    if (!quote) {
      quote = MOCK_QUOTES[id];
      isMock = true;
    }
  } catch (error) {
    console.warn("Banco offline ao gerar impressão de proposta. Usando mock.");
    quote = MOCK_QUOTES[id];
    isMock = true;
  }

  // Se não achar em lugar nenhum, monta um mock genérico
  if (!quote) {
    quote = {
      id: "q-generic",
      versao: 1,
      subtotal: 58000,
      desconto: 3000,
      valor_final: 55000,
      validade: new Date(),
      observacoes: "Mdf Branco Tx e texturas padrão sob medida. Ferragens telescópicas zincadas padrão com excelente resistência e durabilidade. Garantia de 5 anos da Móveis Unghero.",
      project: {
        client: {
          nome: "Cliente de Demonstração",
          cidade: "Farroupilha",
          telefone: "(54) 99999-0000",
          email: "demo@email.com"
        }
      },
      items: [
        { descricao: "Móveis planejados em MDF texturizado padrão e Branco TX", quantidade: 1, tipo_custo: "MOVEIS_MDF", valor_unitario: 45000, valor_total: 45000 },
        { descricao: "Ferragens telescópicas e dobradiças padrão de alta durabilidade", quantidade: 1, tipo_custo: "FERRAGENS_ESPECIAIS", valor_unitario: 5000, valor_total: 5000 },
        { descricao: "Mão de obra de marcenaria de alto nível e instalação", quantidade: 1, tipo_custo: "MAO_DE_OBRA", valor_unitario: 8000, valor_total: 8000 }
      ]
    };
    isMock = true;
  }

  // Prepara dados
  const client = quote.project.client;
  const formattedValidade = new Date(quote.validade).toLocaleDateString("pt-BR");
  const formattedDataEmissao = new Date().toLocaleDateString("pt-BR");
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  // Helper para obter CPF/CNPJ do campo observacoes do cliente
  const parseDocument = (obs: string | null) => {
    if (!obs) return { tipo: "", documento: "" };
    const pfMatch = obs.match(/\[PF - CPF:\s*([^\]]+)\]/);
    if (pfMatch) return { tipo: "PF", documento: pfMatch[1] };
    const pjMatch = obs.match(/\[PJ - CNPJ:\s*([^\]]+)\]/);
    if (pjMatch) return { tipo: "PJ", documento: pjMatch[1] };
    return { tipo: "", documento: "" };
  };

  const doc = parseDocument(client.observacoes || null);

  return (
    <div className="bg-white text-black min-h-screen font-sans">
      
      {/* Barra superior de controle (Oculta na impressão) */}
      <div className="print:hidden sticky top-0 bg-neutral-900 text-white p-4 flex items-center justify-between shadow-md z-50">
        <Link 
          href={`/projects/${quote.project_id || "proj-1"}`}
          className="inline-flex items-center text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o Projeto
        </Link>
        <div className="flex items-center gap-3">
          {isMock && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded font-semibold">
              Modo de Simulação
            </span>
          )}
          {/* Botão que aciona a impressão nativa do navegador */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir Proposta / Salvar PDF
          </button>
        </div>
      </div>

      {/* Container de Páginas A4 */}
      <div className="max-w-[800px] mx-auto p-4 md:p-8 space-y-8 print:p-0 print:space-y-0">

        {/* ================= PÁGINA 1: CAPA ================= */}
        <div className="w-full h-[1120px] border border-neutral-200 shadow-lg p-16 flex flex-col justify-between items-center bg-radial-gradient from-neutral-50 to-white print:border-none print:shadow-none print:h-[297mm] print:w-[210mm] print:page-break-after-always break-after-page page-break-after-always">
          <div className="text-center pt-16">
            <div className="inline-flex p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 mb-6">
              <Sparkles className="h-10 w-10" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-widest text-neutral-900">
              MÓVEIS UNGHERO
            </h1>
            <span className="text-xs uppercase tracking-widest text-neutral-500 font-semibold block mt-1">
              Móveis Sob Medida & Design Fino
            </span>
          </div>

          <div className="text-center space-y-4">
            <div className="h-0.5 w-16 bg-amber-500 mx-auto" />
            <h2 className="text-3xl font-black text-neutral-900 uppercase tracking-wide leading-tight">
              Proposta Comercial
            </h2>
            <p className="text-sm text-neutral-500">
              Projeto Completo de Interiores Residencial
            </p>
          </div>

          <div className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-8 space-y-2 text-sm text-neutral-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Cliente / Contratante</span>
                <strong className="text-neutral-900 text-base">{client.nome}</strong>
                {doc.documento && (
                  <span className="text-xs text-neutral-500 block font-bold mt-0.5">{doc.tipo}: {doc.documento}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Cidade de Instalação</span>
                <strong className="text-neutral-900 text-base">{client.cidade}</strong>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Data Emissão</span>
                <strong className="text-neutral-900 block">{formattedDataEmissao}</strong>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Validade Proposta</span>
                <strong className="text-neutral-900 block">{formattedValidade}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ================= PÁGINA 2: CONCEITO & DESCRITIVO ================= */}
        <div className="w-full h-[1120px] border border-neutral-200 shadow-lg p-16 flex flex-col justify-between bg-white print:border-none print:shadow-none print:h-[297mm] print:w-[210mm] print:page-break-after-always break-after-page page-break-after-always">
          <div className="space-y-6">
            <PrintHeader pageNum="02" title="Memorial Conceitual" />

            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">Conceito do Projeto</h3>
              <div className="h-0.5 w-10 bg-amber-500" />
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed text-justify">
              O presente projeto foi elaborado visando a otimização máxima dos espaços, aliando ergonomia, sofisticação estética e funcionalidade operacional no cotidiano. O desenvolvimento sob medida atende perfeitamente a cada ângulo do imóvel, garantindo acabamentos impecáveis de marcenaria de alto padrão.
            </p>

            <div className="space-y-4 mt-8">
              <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Descritivo Técnico dos Materiais</h4>
              <div className="p-6 rounded-lg bg-neutral-50 border border-neutral-100 text-sm text-neutral-700 leading-relaxed">
                {quote.observacoes || "Nenhum descritivo de materiais especificado para esta proposta."}
              </div>
            </div>
          </div>

          <PrintFooter version={quote.versao} />
        </div>

        {/* ================= PÁGINA 3: TABELA COMERCIAL ================= */}
        <div className="w-full h-[1120px] border border-neutral-200 shadow-lg p-16 flex flex-col justify-between bg-white print:border-none print:shadow-none print:h-[297mm] print:w-[210mm] print:page-break-after-always break-after-page page-break-after-always">
          <div className="space-y-6">
            <PrintHeader pageNum="03" title="Detalhamento Comercial" />

            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">Valores e Itens do Projeto</h3>
              <div className="h-0.5 w-10 bg-amber-500" />
            </div>

            <table className="w-full text-sm text-left border-collapse mt-4">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 text-xs uppercase font-bold bg-neutral-50">
                  <th className="p-3">Descrição do Item</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3 text-right">Unitário</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {quote.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium text-neutral-950">{item.descricao}</td>
                    <td className="p-3 text-center">{item.quantidade}</td>
                    <td className="p-3 text-right">{formatCurrency(item.valor_unitario)}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(item.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Fechamento Comercial */}
            <div className="mt-8 border-t border-neutral-200 pt-6 space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Subtotal dos Itens:</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.desconto > 0 && (
                <div className="flex justify-between text-sm text-amber-600 font-medium">
                  <span>Desconto Aplicado:</span>
                  <span>-{formatCurrency(quote.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-lg font-black text-neutral-950">
                <span>VALOR TOTAL VENDIDO:</span>
                <span>{formatCurrency(quote.valor_final)}</span>
              </div>
            </div>
          </div>

          <PrintFooter version={quote.versao} />
        </div>

        {/* ================= PÁGINA 4: CONDIÇÕES & GARANTIA ================= */}
        <div className="w-full h-[1120px] border border-neutral-200 shadow-lg p-16 flex flex-col justify-between bg-white print:border-none print:shadow-none print:h-[297mm] print:w-[210mm] print:page-break-after-always break-after-page page-break-after-always">
          <div className="space-y-6">
            <PrintHeader pageNum="04" title="Condições Gerais" />

            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">Condições Comerciais e Garantia</h3>
              <div className="h-0.5 w-10 bg-amber-500" />
            </div>

            <div className="space-y-6 text-sm text-neutral-700 leading-relaxed mt-4">
              <div className="space-y-1">
                <strong className="text-neutral-950 block">1. Formas de Pagamento</strong>
                <p>O pagamento do valor acordado poderá ser efetuado através de:</p>
                <ul className="list-disc list-inside pl-2 space-y-1 text-neutral-600">
                  <li>50% de entrada (na assinatura) + 50% na data de entrega física dos módulos.</li>
                  <li>Parcelamento em até 10x sem juros em cartões de crédito aceitos.</li>
                  <li>Financiamento via boleto bancário (sujeito a análise de crédito).</li>
                </ul>
              </div>

              <div className="space-y-1">
                <strong className="text-neutral-950 block">2. Prazo de Fabricação e Montagem</strong>
                <p>
                  O prazo estimado para início da entrega é de 30 a 45 dias úteis a contar a partir da aprovação final do projeto executivo técnico e medição em loco feita pela equipe de projetistas. A montagem será efetuada por técnicos próprios da empresa.
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-neutral-950 block">3. Termos de Garantia do Mobiliário</strong>
                <p>
                  Garantimos a qualidade estrutural e de painéis MDF contra defeitos de fabricação pelo período de 5 anos (ou 10 anos para a linha Premium) contados a partir da data de término da montagem técnica. Ferragens especiais contam com garantia adicional de fabricante.
                </p>
              </div>
            </div>
          </div>

          <PrintFooter version={quote.versao} />
        </div>

        {/* ================= PÁGINA 5: ASSINATURA ================= */}
        <div className="w-full h-[1120px] border border-neutral-200 shadow-lg p-16 flex flex-col justify-between bg-white print:border-none print:shadow-none print:h-[297mm] print:w-[210mm] print:page-break-after-always break-after-page page-break-after-always">
          <div className="space-y-6">
            <PrintHeader pageNum="05" title="Termo de Aceite" />

            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">Aceite da Proposta Comercial</h3>
              <div className="h-0.5 w-10 bg-amber-500" />
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed text-justify mt-4">
              Estando em perfeita concordância com os valores descritos na tabela comercial, especificações de materiais, prazos de entrega e termos gerais desta proposta, as partes firmam o presente termo para início da elaboração do memorial executivo de fábrica.
            </p>

            {/* Linhas de Assinatura */}
            <div className="grid grid-cols-2 gap-12 pt-24 text-sm text-center text-neutral-700">
              <div className="space-y-2">
                <div className="border-t border-neutral-300 w-full pt-2" />
                <strong className="text-neutral-950 block">{client.nome}</strong>
                {doc.documento && (
                  <span className="text-xs text-neutral-500 block font-semibold">{doc.tipo}: {doc.documento}</span>
                )}
                <span className="text-xs text-neutral-400">Contratante (Cliente)</span>
              </div>
              <div className="space-y-2">
                <div className="border-t border-neutral-300 w-full pt-2" />
                <strong className="text-neutral-950 block">Móveis Unghero LTDA</strong>
                <span className="text-xs text-neutral-400">Contratada</span>
              </div>
            </div>
          </div>

          <PrintFooter version={quote.versao} />
        </div>

      </div>
    </div>
  );
}
