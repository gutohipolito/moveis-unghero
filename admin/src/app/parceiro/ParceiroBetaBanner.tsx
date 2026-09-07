"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const NOTICE = "Portal em testes — alguns dados ainda podem mudar.";
const STORAGE_KEY = "parceiro-beta-banner-dismissed:v1";

export default function ParceiroBetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* private mode */
    }
    setVisible(true);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null;

  return (
    <div className="parceiro-portal-beta-banner" role="status">
      <div className="parceiro-portal-beta-banner-inner">
        <span className="parceiro-portal-beta-banner-chip">Beta</span>
        <p className="parceiro-portal-beta-banner-copy">{NOTICE}</p>
        <button
          type="button"
          className="parceiro-portal-banner-dismiss"
          onClick={dismiss}
          aria-label="Fechar aviso beta"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
