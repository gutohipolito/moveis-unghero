import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyTimeCards, getColaboradorMetrics } from "@/app/actions/ponto";
import { guardModule } from "@/lib/moduleAccess";
import PortalColaboradorClient from "@/components/PortalColaboradorClient";

export default async function PortalColaboradorPage() {
  await guardModule("factory");
  const session = await getSessionSafe(await headers()).catch(() => null);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const userName = session.user.name;
  const userCargo = session.user.cargo;

  let tasks: Array<{
    id: string;
    nome: string;
    tipo: string;
    status: string;
    projectId: string;
    clientName: string;
  }> = [];
  let timeCards: Awaited<ReturnType<typeof getMyTimeCards>>["cards"] = [];

  let metrics = {
    ativos: 0,
    finalizadosSemana: 0,
    totalGeral: 0,
    metaSemanal: 6,
  };

  try {
    const dbTasks = await prisma.environment.findMany({
      where: { responsavel_id: userId },
      include: {
        project: { include: { client: true } },
      },
    });

    tasks = dbTasks.map((t) => ({
      id: t.id,
      nome: t.nome,
      tipo: t.tipo,
      status: t.status,
      projectId: t.project.id,
      clientName: t.project.client.nome,
    }));

    const pontoRes = await getMyTimeCards(userId);
    if (pontoRes.success && pontoRes.cards) {
      timeCards = pontoRes.cards;
    }

    const metricsRes = await getColaboradorMetrics(userId);
    if (metricsRes.success && metricsRes.metrics) {
      metrics = metricsRes.metrics;
    }
  } catch (error) {
    console.warn("Falha de conexão com banco de dados no Portal do Colaborador.", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gradient-gold">
          Portal do Colaborador
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Acompanhe seu progresso semanal na fábrica e registre sua folha de ponto digital.
        </p>
      </div>

      <PortalColaboradorClient
        userId={userId}
        userName={userName}
        userCargo={userCargo}
        initialTimeCards={timeCards ?? []}
        initialTasks={tasks}
        metrics={metrics}
      />
    </div>
  );
}
