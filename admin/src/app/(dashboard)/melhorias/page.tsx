import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { guardModule } from "@/lib/moduleAccess";
import { getAuthContext } from "@/lib/auth-guard";
import { isReadOnlyRole } from "@/lib/permissions";
import { listSuggestions } from "@/app/actions/suggestions";
import MelhoriasClient from "./MelhoriasClient";

export default async function MelhoriasPage() {
  await guardModule("melhorias");

  const auth = await getAuthContext();
  const { suggestions } = await listSuggestions();
  const blurContent = isReadOnlyRole(auth?.cargo);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Melhorias"
        description="Sugestões dos operadores para evoluir o sistema. Marque com o check quando concluídas."
        help={
          <TooltipBody
            title="Como funciona"
            items={[
              "Qualquer colaborador pode sugerir melhorias pelo botão flutuante (lâmpada).",
              "Parceiros enviam pelo portal (só envio, sem ver a lista), com limite de 3 por hora.",
              "As sugestões aparecem aqui em lista, das mais recentes para as antigas.",
              "Clique no círculo à esquerda para marcar como concluída (ou reabrir).",
              "O autor ou a Diretoria pode remover uma sugestão.",
            ]}
          />
        }
      />
      <MelhoriasClient
        initialSuggestions={suggestions}
        isAdmin={auth?.cargo === "ADMIN"}
        currentUserId={auth?.userId ?? ""}
        blurContent={blurContent}
      />
    </div>
  );
}
