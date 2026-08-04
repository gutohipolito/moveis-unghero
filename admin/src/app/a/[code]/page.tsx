import React from "react";
import { notFound } from "next/navigation";
import ClientSignupForm from "@/app/cadastro/ClientSignupForm";
import FormLgpdNotice from "@/components/forms/FormLgpdNotice";
import { resolvePartnerByInviteCode } from "@/lib/partnerInvite";
import { getPartnerRoleLabel } from "@/lib/partnerTypes";
import { PUBLIC_PAGE_COPY, publicPageMetadata } from "@/lib/publicPageMetadata";

export const metadata = publicPageMetadata({
  title: `Cadastro | ${PUBLIC_PAGE_COPY.cadastroCliente.title}`,
  description: "Cadastro indicado por parceiro Móveis Unghero.",
  noIndex: true,
});

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function PartnerInviteCadastroPage({ params }: PageProps) {
  const { code } = await params;
  const partner = await resolvePartnerByInviteCode(code);
  if (!partner) notFound();

  const roleLabel = getPartnerRoleLabel(partner.tipo, partner.nome);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-between relative w-full max-w-full overflow-x-hidden text-slate-100">
      <div
        className="absolute inset-0 z-0 bg-[url('/factory-bg.png')] bg-cover bg-center opacity-15 pointer-events-none"
        style={{ filter: "brightness(0.20) contrast(1.15) grayscale(0.2)" }}
      />

      <div className="w-full flex justify-center pt-8 pb-4 md:pt-12 md:pb-6 z-10 shrink-0">
        <img src="/logo.png" alt="Móveis Unghero" className="h-10 w-auto object-contain" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12 z-10 w-full max-w-2xl mx-auto">
        <div className="w-full mb-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex items-center gap-3">
          <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-800 border border-white/15 shrink-0 flex items-center justify-center">
            {partner.fotoUrl ? (
              <img
                src={partner.fotoUrl}
                alt={partner.nome}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-black text-white/70">
                {partner.nome
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-200/80">
              Indicado por
            </p>
            <p className="text-base font-bold text-white truncate">{partner.nome}</p>
            <p className="text-xs text-slate-400 truncate">
              {roleLabel}
              {partner.escritorio ? ` · ${partner.escritorio}` : ""}
            </p>
          </div>
        </div>

        <div className="text-center mb-6 space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
            Faça seu Cadastro
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
            Complete seus dados para a Móveis Unghero preparar o atendimento do seu
            projeto, em parceria com {partner.nome.split(/\s+/)[0]}.
          </p>
        </div>

        <ClientSignupForm partnerInviteCode={partner.invite_code || code} />
        <FormLgpdNotice />
      </div>

      <footer className="w-full border-t border-slate-900/60 bg-slate-950/80 backdrop-blur-sm py-6 text-center text-xs font-bold text-slate-500 z-10 shrink-0">
        <p>© {new Date().getFullYear()} Móveis Unghero — Todos os direitos reservados.</p>
        <p className="text-[10px] font-semibold text-slate-600 mt-1">Farroupilha · RS · desde 2006</p>
      </footer>
    </main>
  );
}
