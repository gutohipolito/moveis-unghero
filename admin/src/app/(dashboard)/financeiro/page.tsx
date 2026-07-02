import { headers } from "next/headers";
import { getSessionSafe } from "@/lib/auth";
import { prisma, isDatabaseOffline, setDatabaseOffline } from "@/lib/prisma";
import FinanceiroClient from "./FinanceiroClient";

// Mock de faturas e parcelas financeiras
const MOCK_INSTALLMENTS = [
  {
    id: "inst-1",
    valor: 39000.0,
    data_vencimento: new Date("2026-06-15T00:00:00Z").toISOString(),
    data_pagamento: new Date("2026-06-15T15:00:00Z").toISOString(),
    status: "PAGO",
    tipo: "ENTRADA",
    project: {
      id: "proj-6",
      client: {
        nome: "Juliana Castro"
      }
    }
  },
  {
    id: "inst-2",
    valor: 25000.0,
    data_vencimento: new Date("2026-07-15T00:00:00Z").toISOString(),
    data_pagamento: null,
    status: "PENDENTE",
    tipo: "PARCELA",
    project: {
      id: "proj-6",
      client: {
        nome: "Juliana Castro"
      }
    }
  },
  {
    id: "inst-3",
    valor: 25000.0,
    data_vencimento: new Date("2026-08-15T00:00:00Z").toISOString(),
    data_pagamento: null,
    status: "PENDENTE",
    tipo: "PARCELA",
    project: {
      id: "proj-6",
      client: {
        nome: "Juliana Castro"
      }
    }
  },
  {
    id: "inst-4",
    valor: 39000.0,
    data_vencimento: new Date("2026-06-25T00:00:00Z").toISOString(),
    data_pagamento: new Date("2026-06-25T10:30:00Z").toISOString(),
    status: "PAGO",
    tipo: "ENTRADA",
    project: {
      id: "proj-2",
      client: {
        nome: "Mariana Rezende"
      }
    }
  },
  {
    id: "inst-5",
    valor: 39000.0,
    data_vencimento: new Date("2026-07-25T00:00:00Z").toISOString(),
    data_pagamento: null,
    status: "PENDENTE",
    tipo: "PARCELA",
    project: {
      id: "proj-2",
      client: {
        nome: "Mariana Rezende"
      }
    }
  },
  {
    id: "inst-6",
    valor: 20000.0,
    data_vencimento: new Date("2026-06-01T00:00:00Z").toISOString(),
    data_pagamento: null,
    status: "ATRASADO",
    tipo: "PARCELA",
    project: {
      id: "proj-1",
      client: {
        nome: "Renato Silveira"
      }
    }
  }
];

export default async function FinanceiroPage() {
  const session = await getSessionSafe(await headers()).catch(() => null);

  const userCompanyId = session?.user?.company_id || "mock-company-id";

  let installments = [];
  let isMock = false;

  if (isDatabaseOffline()) {
    installments = MOCK_INSTALLMENTS;
    isMock = true;
  } else {
    try {
      // Busca do banco
      installments = await prisma.installment.findMany({
        where: {
          project: {
            client: {
              company_id: userCompanyId
            }
          }
        },
        include: {
          project: {
            include: {
              client: true
            }
          }
        },
        orderBy: {
          data_vencimento: "asc"
        }
      });

      if (installments.length === 0) {
        installments = MOCK_INSTALLMENTS;
        isMock = true;
      }
    } catch (error) {
      console.warn("Falha de conexão com banco de dados no financeiro geral. Usando mocks.");
      setDatabaseOffline(true);
      installments = MOCK_INSTALLMENTS;
      isMock = true;
    }
  }

  // Formata os dados de forma segura
  const formattedInsts = installments.map((ins: any) => ({
    id: ins.id,
    valor: Number(ins.valor),
    data_vencimento: ins.data_vencimento.toISOString ? ins.data_vencimento.toISOString() : new Date(ins.data_vencimento).toISOString(),
    data_pagamento: ins.data_pagamento ? (ins.data_pagamento.toISOString ? ins.data_pagamento.toISOString() : new Date(ins.data_pagamento).toISOString()) : null,
    status: ins.status,
    tipo: ins.tipo,
    projectId: ins.project.id,
    clientName: ins.project.client.nome
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient-gold">
            Painel Financeiro Simplificado
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe o faturamento, entradas, saldo devedor e controle as parcelas de recebíveis de todos os projetos.
          </p>
        </div>
        {isMock && (
          <span className="self-start text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded font-semibold tracking-wide uppercase">
            Dados de Demonstração
          </span>
        )}
      </div>

      <FinanceiroClient initialInstallments={formattedInsts} />
    </div>
  );
}
