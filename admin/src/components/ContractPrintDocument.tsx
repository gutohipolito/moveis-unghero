import type { ReactNode } from "react";
import { QUOTE_PRINT_FACTORY } from "@/components/QuotePrintDocument";
import {
  applyContractPlaceholders,
  formatContractDateLong,
} from "@/lib/contractTemplates";

export type ContractPrintData = {
  titulo: string;
  cliente_nome: string;
  cliente_documento: string;
  cliente_endereco: string;
  servicos: string;
  valor: number;
  entrada_pct: number;
  clausula_local: string;
  clausula_pagamento: string;
  clausula_prazo: string;
  clausula_extra?: string | null;
  data_entrega?: Date | string | null;
  data_contrato: Date | string;
  cidade_emissao: string;
};

export function contractPrintStylesCss() {
  return `
    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      html, body {
        background-color: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-page {
        width: 210mm !important;
        height: auto !important;
        min-height: 297mm !important;
        max-height: none !important;
        page-break-after: auto !important;
        break-after: auto !important;
        padding: 0 !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        border: none !important;
        box-shadow: none !important;
        background: #ffffff !important;
        overflow: visible !important;
      }
      .print-shell {
        min-height: 0 !important;
        height: auto !important;
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-shell-inner {
        max-width: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print\\:hidden {
        display: none !important;
      }
      /* Logo branco-sobre-preto → preto-sobre-branco no papel */
      .contract-logo-header {
        filter: invert(1) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .contract-watermark {
        opacity: 0.09 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .contract-watermark img {
        filter: invert(1) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      a[href^="http"]::after,
      a[href^="mailto"]::after {
        content: none !important;
      }
    }
    @media screen {
      .print-shell {
        min-height: 100vh;
        background: #e5e5e5;
        padding: 2rem 1rem;
      }
      .print-shell-inner {
        max-width: 210mm;
        margin: 0 auto;
      }
      .print-page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #fff;
        box-shadow: 0 8px 30px rgba(0,0,0,.12);
      }
    }
  `;
}

function factoryIntro() {
  const f = QUOTE_PRINT_FACTORY;
  return `NÓS DOS ${f.name.toUpperCase()}, CNPJ ${f.cnpj.replace(/\D/g, "")} COM SEDE NA ${f.street.toUpperCase()}, BAIRRO ${f.neighborhood.toUpperCase()}, NA CIDADE DE ${f.city.toUpperCase().replace("—", "")}, NESTE ATO REPRESENTADA CONFORME PODERES ESPECIALMENTE CONFERIDOS`;
}

type ContractPrintDocumentProps = {
  contract: ContractPrintData;
  assetBase?: string;
  topBar?: ReactNode;
};

export default function ContractPrintDocument({
  contract,
  assetBase = "",
  topBar,
}: ContractPrintDocumentProps) {
  const logoSrc = `${assetBase}/logo.png`;
  const f = QUOTE_PRINT_FACTORY;
  const vars = {
    valor: contract.valor,
    entrada_pct: contract.entrada_pct,
    data_entrega: contract.data_entrega,
  };

  const pagamento = applyContractPlaceholders(contract.clausula_pagamento, vars);
  const prazo = applyContractPlaceholders(contract.clausula_prazo, vars);
  const dataLabel = formatContractDateLong(contract.data_contrato);

  const contratante = `POR ${contract.cliente_nome.toUpperCase()}, ${
    contract.cliente_documento ? `DOCUMENTO ${contract.cliente_documento.toUpperCase()}, ` : ""
  }COM ENDEREÇO ${contract.cliente_endereco.toUpperCase()}.`;

  const servicos = `POR MEIO DESTE CONTRATO, O CONTRATADO SE COMPROMETE A PRESTAR AO CONTRATANTE OS SEGUINTES SERVIÇOS: ${contract.servicos.toUpperCase()}.`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: contractPrintStylesCss() }} />
      <div className="print-shell">
        {topBar ? <div className="print:hidden mb-4">{topBar}</div> : null}
        <div className="print-shell-inner">
          <article className="print-page relative flex flex-col text-neutral-900 overflow-hidden">
            {/* Marca d'água (timbrado) — logo invertido + baixa opacidade */}
            <div
              className="contract-watermark pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.09]"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt=""
                className="w-[62%] max-w-[360px] object-contain invert"
              />
            </div>

            <header className="relative z-10 flex items-center justify-between border-b border-neutral-200 px-10 pt-8 pb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={f.name}
                className="contract-logo-header h-10 w-auto object-contain invert"
              />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                Documento contratual
              </p>
            </header>

            <main className="relative z-10 flex-1 px-10 py-8 space-y-5 text-[12.5px] leading-relaxed font-medium">
              <h1 className="text-center text-base font-black uppercase tracking-wide text-neutral-900">
                {contract.titulo}
              </h1>

              <p className="text-justify uppercase tracking-wide text-[11.5px] leading-[1.65]">
                {factoryIntro()} {contratante}
              </p>

              <p className="text-justify uppercase tracking-wide text-[11.5px] leading-[1.65]">
                {servicos} {contract.clausula_local.toUpperCase()}
              </p>

              <p className="text-justify uppercase tracking-wide text-[11.5px] leading-[1.65]">
                {pagamento.toUpperCase()}
              </p>

              <p className="text-justify uppercase tracking-wide text-[11.5px] leading-[1.65]">
                {prazo.toUpperCase()}
              </p>

              {contract.clausula_extra?.trim() ? (
                <p className="text-justify uppercase tracking-wide text-[11.5px] leading-[1.65]">
                  {contract.clausula_extra.toUpperCase()}
                </p>
              ) : null}

              <p className="pt-4 text-center uppercase tracking-wide text-[12px] font-bold">
                {contract.cidade_emissao.toUpperCase()}, {dataLabel.toUpperCase()}
              </p>

              <div className="grid grid-cols-2 gap-10 pt-16">
                <div className="text-center space-y-2">
                  <div className="border-t border-neutral-800 mx-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Assinatura do Contratado
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="border-t border-neutral-800 mx-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Assinatura do Contratante
                  </p>
                </div>
              </div>
            </main>

            <footer className="relative z-10 mt-auto border-t border-neutral-200 px-10 py-5 text-[10px] text-neutral-600">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-bold text-neutral-800">{f.name}</p>
                  <p>CNPJ {f.cnpj}</p>
                  <p>
                    {f.street} — {f.neighborhood} — {f.city}
                  </p>
                </div>
                <div className="sm:text-right space-y-0.5">
                  <p>{f.whatsapp}</p>
                  <p>{f.email}</p>
                  <p>{f.site}</p>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </>
  );
}
