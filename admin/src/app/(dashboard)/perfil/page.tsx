import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { getAuthContext } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/permissions";
import PerfilClient from "./PerfilClient";

export default async function PerfilPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true, email: true, image: true, cargo: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu perfil"
        description="Atualize seu nome, foto e senha de acesso ao painel."
        help={
          <TooltipBody
            title="Perfil pessoal"
            items={[
              "Estas alterações valem só para a sua conta.",
              "Configurações da empresa ficam em Configurações (Diretoria).",
              "A senha precisa ter pelo menos 8 caracteres.",
            ]}
          />
        }
      />
      <PerfilClient
        initial={{
          name: user.name,
          email: user.email,
          image: user.image,
          cargoLabel: ROLE_LABELS[user.cargo] || user.cargo,
        }}
      />
    </div>
  );
}
