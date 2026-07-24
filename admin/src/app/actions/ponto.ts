"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthContext , assertCanWrite } from "@/lib/auth-guard";

// Busca os pontos batidos pelo colaborador no mês atual
export async function getMyTimeCards(_userId: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const userId = auth.userId;

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const cards = await prisma.timeCard.findMany({
      where: {
        user_id: userId,
        data: {
          gte: startOfMonth,
        },
      },
      orderBy: {
        data: "desc",
      },
    });

    // Converte os decimais/datas em formatos serializáveis para o cliente
    const formatted = cards.map((c) => ({
      id: c.id,
      data: c.data,
      entrada: c.entrada,
      almoco_in: c.almoco_in,
      almoco_out: c.almoco_out,
      saida: c.saida,
      horas: c.horas ? Number(c.horas) : null,
    }));

    return { success: true, cards: formatted };
  } catch (error: any) {
    console.error("Erro ao buscar histórico de pontos:", error);
    return { success: false, error: error.message };
  }
}

// Bate o ponto do dia do colaborador
export async function registerPonto(
  _userId: string,
  tipo: "entrada" | "almoco_in" | "almoco_out" | "saida"
) {
  const auth = await getAuthContext();
  if (auth) assertCanWrite(auth);
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const userId = auth.userId;

  try {
    const now = new Date();
    
    // Início do dia (timezone do servidor)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Busca se já existe uma folha de ponto para hoje
    let todayCard = await prisma.timeCard.findFirst({
      where: {
        user_id: userId,
        data: {
          gte: startOfToday,
        },
      },
    });

    if (!todayCard) {
      // Se não existe, cria um novo
      todayCard = await prisma.timeCard.create({
        data: {
          user_id: userId,
          data: now,
        },
      });
    }

    // Define o campo correspondente
    const updateData: any = {};
    if (tipo === "entrada") updateData.entrada = now;
    else if (tipo === "almoco_in") updateData.almoco_in = now;
    else if (tipo === "almoco_out") updateData.almoco_out = now;
    else if (tipo === "saida") updateData.saida = now;

    // Atualiza a folha de ponto
    let updatedCard = await prisma.timeCard.update({
      where: { id: todayCard.id },
      data: updateData,
    });

    // Se bateu saída, calcula o total de horas trabalhadas no dia
    if (updatedCard.entrada && updatedCard.saida) {
      let totalMs = updatedCard.saida.getTime() - updatedCard.entrada.getTime();
      
      // Desconta o almoço se tiver
      if (updatedCard.almoco_in && updatedCard.almoco_out) {
        const almocoMs = updatedCard.almoco_out.getTime() - updatedCard.almoco_in.getTime();
        totalMs -= almocoMs;
      }

      // Calcula horas líquidas com 2 casas decimais
      const totalHoras = Number((totalMs / (1000 * 60 * 60)).toFixed(2));

      updatedCard = await prisma.timeCard.update({
        where: { id: todayCard.id },
        data: {
          horas: totalHoras,
        },
      });
    }

    revalidatePath("/factory/portal");
    return { 
      success: true, 
      card: {
        id: updatedCard.id,
        data: updatedCard.data,
        entrada: updatedCard.entrada,
        almoco_in: updatedCard.almoco_in,
        almoco_out: updatedCard.almoco_out,
        saida: updatedCard.saida,
        horas: updatedCard.horas ? Number(updatedCard.horas) : null,
      }
    };
  } catch (error: any) {
    console.error("Erro ao bater ponto:", error);
    return { success: false, error: error.message };
  }
}

// Retorna estatísticas de produtividade do colaborador
export async function getColaboradorMetrics(_userId: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  const userId = auth.userId;

  try {
    // 1. Busca cômodos em andamento sob a responsabilidade dele
    const ativosCount = await prisma.environment.count({
      where: {
        responsavel_id: userId,
        NOT: {
          status: "FINALIZADO",
        },
      },
    });

    // 2. Busca cômodos finalizados por ele na semana atual (últimos 7 dias)
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    // Como o model Environment não tem updatedAt nativo, simulamos o progresso com base nas tarefas sob sua responsabilidade
    const totalDelegados = await prisma.environment.count({
      where: {
        responsavel_id: userId,
      },
    });

    const finalizadosCount = await prisma.environment.count({
      where: {
        responsavel_id: userId,
        status: "FINALIZADO",
      },
    });

    // Retorna as métricas formatadas
    return {
      success: true,
      metrics: {
        ativos: ativosCount,
        finalizadosSemana: finalizadosCount,
        totalGeral: totalDelegados,
        metaSemanal: 6, // Meta sugerida de 6 cômodos
      },
    };
  } catch (error: any) {
    console.error("Erro ao buscar métricas de produtividade:", error);
    return { success: false, error: error.message };
  }
}
