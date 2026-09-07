"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { exitPartnerAdminPreview } from "@/app/actions/parceiroPortal";

const SESSION_KEY = "parceiro-admin-preview-banner-dismissed";

type Props = {
  partnerNome: string;
};

/** Aviso de preview da diretoria — pode ser fechado nesta sessão. */
export default function ParceiroAdminPreviewBanner({ partnerNome }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null;

  return (
    <div className="parceiro-portal-admin-banner" role="status">
      <div className="parceiro-portal-admin-banner-inner">
        <span>
          Visualização da Diretoria — portal como <strong>{partnerNome}</strong>
          {" "}(expira em 45 min).
        </span>
        <div className="parceiro-portal-admin-banner-actions">
          <form action={exitPartnerAdminPreview}>
            <button type="submit" className="parceiro-portal-admin-banner-link">
              Voltar ao admin
            </button>
          </form>
          <button
            type="button"
            className="parceiro-portal-banner-dismiss is-on-admin"
            onClick={dismiss}
            aria-label="Fechar aviso de visualização"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
