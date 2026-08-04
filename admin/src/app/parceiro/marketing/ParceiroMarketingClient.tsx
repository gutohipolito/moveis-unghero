"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Megaphone } from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ParceiroMarketingClientProps {
  partner: PartnerPortalData;
  inviteUrl: string;
  isAdminPreview?: boolean;
}

function buildDefaultWhatsAppMessage(partnerName: string, inviteUrl: string) {
  const first = partnerName.trim().split(/\s+/)[0] || "seu arquiteto";
  return (
    `Olá! Sou ${first}, parceiro(a) da Móveis Unghero.\n\n` +
    `Para darmos andamento ao seu projeto de móveis sob medida, peço que faça um cadastro rápido neste link:\n` +
    `${inviteUrl}\n\n` +
    `É só preencher os dados — a equipe da Unghero recebe automaticamente e eu acompanho junto com você.`
  );
}

export default function ParceiroMarketingClient({
  partner,
  inviteUrl,
  isAdminPreview = false,
}: ParceiroMarketingClientProps) {
  const [message, setMessage] = useState(() =>
    buildDefaultWhatsAppMessage(partner.nome, inviteUrl)
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const waHref = useMemo(() => {
    const text = message.trim() || buildDefaultWhatsAppMessage(partner.nome, inviteUrl);
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [message, partner.nome, inviteUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-5 max-w-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Marketing
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-lg">
            Envie o link de cadastro para clientes frios. Quem se cadastrar por ele aparece
            automaticamente na sua lista de clientes.
          </p>
        </div>

        <div className="partner-card p-5 space-y-4">
          <div className="partner-card-accent" />
          <div className="flex items-start gap-3">
            <div className="inline-flex p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-900 text-base">
                Seu link de indicação
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Exclusivo seu — a Móveis Unghero identifica que o lead veio de você.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              readOnly
              value={inviteUrl}
              className="font-mono text-xs h-11 bg-slate-50"
              onFocus={(e) => e.target.select()}
            />
            <Button
              type="button"
              variant="outline"
              className="font-bold gap-1.5 h-11 shrink-0"
              onClick={() => void copyLink()}
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar link
                </>
              )}
            </Button>
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-[var(--radius-sm)] border border-slate-200 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50 shrink-0"
            >
              <ExternalLink className="h-4 w-4" /> Abrir
            </a>
          </div>
        </div>

        <div className="partner-card p-5 space-y-4">
          <div className="partner-card-accent" />
          <div>
            <h2 className="font-display font-bold text-slate-900 text-base">
              Mensagem para WhatsApp
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Texto pronto para cliente frio. Você pode ajustar antes de enviar.
            </p>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-[var(--radius-sm)] font-bold text-white btn-metallic border-none bg-slate-950 hover:bg-slate-900"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </a>
            <Button
              type="button"
              variant="outline"
              className="font-bold gap-1.5 h-11"
              onClick={() => void copyMessage()}
            >
              {copiedMsg ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" /> Mensagem copiada
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar mensagem
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ParceiroPortalShell>
  );
}
