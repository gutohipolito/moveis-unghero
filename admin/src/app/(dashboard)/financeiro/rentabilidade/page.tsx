import { guardModule } from "@/lib/moduleAccess";
import { getProjectProfitability, type ProfitabilityData } from "@/app/actions/profitability";
import PageHeader from "@/components/PageHeader";
import RentabilidadeClient from "./RentabilidadeClient";

export default async function RentabilidadePage() {
  await guardModule("financeiro");

  let data: ProfitabilityData = {
    rows: [],
    totalReceita: 0,
    totalCusto: 0,
    totalMargem: 0,
    totalRecebido: 0,
  };
  try {
    const res = await getProjectProfitability();
    if (res.success) data = res.data;
  } catch (error) {
    console.warn("Falha ao carregar rentabilidade.", error);
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Rentabilidade por obra — receita do contrato menos os custos vinculados."
        help={
          <>
            <p className="text-xs font-bold text-slate-700 mb-1.5">
              Como calculamos a rentabilidade
            </p>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-600">
              <li>
                <strong className="text-slate-700">Receita</strong> = valor do orçamento aprovado
                (ou o previsto, quando não há aprovado — sinalizado na linha).
              </li>
              <li>
                <strong className="text-slate-700">Custo</strong> = despesas vinculadas à obra em
                Contas a Pagar (ignorando canceladas).
              </li>
              <li>
                <strong className="text-slate-700">Margem</strong> = receita − custo. Vincule as
                despesas ao projeto para a margem ficar precisa.
              </li>
            </ul>
            <p className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              Cores da margem
            </p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600">
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Negativa
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Abaixo de 25%
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> 25% ou mais
              </li>
            </ul>
          </>
        }
      />

      <RentabilidadeClient data={data} />
    </>
  );
}
