"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Megaphone } from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { Input } from "@/components/ui/input";

interface ParceiroMarketingClientProps {
  partner: PartnerPortalData;
  inviteUrl: string;
  isAdminPreview?: boolean;
}

function buildDefaultWhatsAppMessage(_partnerName: string, inviteUrl: string) {
  return (
    `Olá! Tudo bem?\n\n` +
    `Para fazer o orçamento dos móveis, vou precisar que você faça um cadastro rápido com a Móveis Unghero. ` +
    `Com esses dados eles conseguem montar o orçamento.\n\n` +
    `Pode inserir só os dados pessoais — sobre o projeto eu vejo diretamente com eles. Pode ser?\n\n` +
    `Segue o link para o cadastro:\n` +
    `${inviteUrl}`
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
      <div className="parceiro-marketing space-y-5 max-w-2xl w-full">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Marketing
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-lg leading-relaxed">
            Envie o link de cadastro para o seu cliente. Quem se cadastrar por ele aparece
            automaticamente na sua lista.
          </p>
        </div>

        <section className="parceiro-marketing-card">
          <div className="parceiro-marketing-card-accent" aria-hidden />
          <div className="parceiro-marketing-card-body space-y-4">
            <div className="flex items-start gap-3">
              <span className="parceiro-marketing-icon">
                <Megaphone className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-[#1a1208] text-base tracking-tight">
                  Seu link de indicação
                </h2>
                <p className="text-xs text-stone-600 mt-0.5 leading-snug">
                  Exclusivo seu — a Móveis Unghero identifica que o lead veio de você.
                </p>
              </div>
            </div>

            <div className="parceiro-marketing-link-row">
              <Input
                readOnly
                value={inviteUrl}
                className="parceiro-marketing-input font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <div className="parceiro-marketing-actions">
                <button
                  type="button"
                  className="parceiro-marketing-btn parceiro-marketing-btn-secondary"
                  onClick={() => void copyLink()}
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-700" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar link
                    </>
                  )}
                </button>
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="parceiro-marketing-btn parceiro-marketing-btn-secondary"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="parceiro-marketing-card">
          <div className="parceiro-marketing-card-accent" aria-hidden />
          <div className="parceiro-marketing-card-body space-y-4">
            <div>
              <h2 className="font-display font-bold text-[#1a1208] text-base tracking-tight">
                Mensagem para WhatsApp
              </h2>
              <p className="text-xs text-stone-600 mt-0.5 leading-snug">
                Texto pronto para enviar ao seu cliente. Você pode ajustar antes de enviar.
              </p>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="parceiro-marketing-textarea"
            />

            <div className="parceiro-marketing-actions">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="parceiro-marketing-btn parceiro-marketing-btn-whatsapp"
              >
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp
              </a>
              <button
                type="button"
                className="parceiro-marketing-btn parceiro-marketing-btn-secondary"
                onClick={() => void copyMessage()}
              >
                {copiedMsg ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-700" />
                    Mensagem copiada
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar mensagem
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </ParceiroPortalShell>
  );
}
