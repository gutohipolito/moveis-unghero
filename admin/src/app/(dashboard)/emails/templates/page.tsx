import { guardModule } from "@/lib/moduleAccess";
import { listEmailTransitionTemplates } from "@/app/actions/emailTransitionTemplates";
import EmailTransitionTemplatesPanel from "./EmailTransitionTemplatesPanel";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const maxDuration = 60;

export default async function EmailTemplatesPage() {
  await guardModule("emails");
  const templatesRes = await listEmailTransitionTemplates();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Templates de e-mail"
        description="Textos automáticos enviados a clientes e arquitetos na mudança de etapa."
        help={
          <TooltipBody
            title="E-mails de transição"
            items={[
              "Cada etapa (a partir de Aprovado) tem um texto para o cliente e outro para o arquiteto.",
              "A prévia atualiza na hora. Salve para valer nos próximos envios.",
              "Orçamento e recibo continuam em Configurar caixas → Templates.",
            ]}
          />
        }
        actions={
          <Link href="/emails">
            <Button variant="outline" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </Link>
        }
      />
      <EmailTransitionTemplatesPanel initialTemplates={templatesRes.data || []} />
    </div>
  );
}
