"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Loader2, LayoutDashboard, Package, Users, Megaphone, FolderKanban, Wallet } from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { getPartnerRoleLabel } from "@/lib/partnerTypes";
import { compressImageFile } from "@/lib/imageCompression";
import { cn } from "@/lib/utils";
import ParceiroUserMenu from "./ParceiroUserMenu";
import ParceiroInfoModal from "./painel/ParceiroInfoModal";
import ParceiroSettingsModal from "./painel/ParceiroSettingsModal";
import {
  applyPartnerUiPrefsToElement,
  DEFAULT_PARTNER_UI_PREFS,
  loadPartnerUiPrefs,
  savePartnerUiPrefs,
  type PartnerUiPrefs,
} from "@/lib/partnerUiPrefs";

const NAV = [
  { href: "/parceiro/painel", label: "Início", icon: LayoutDashboard },
  { href: "/parceiro/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/parceiro/produtos", label: "Produtos", icon: Package },
  { href: "/parceiro/clientes", label: "Clientes", icon: Users },
  { href: "/parceiro/comissoes", label: "Comissões", icon: Wallet },
  { href: "/parceiro/marketing", label: "Marketing", icon: Megaphone },
] as const;

type ShellUi = { openInfo: () => void };

const ParceiroShellUiContext = createContext<ShellUi | null>(null);

export function useParceiroShellUi() {
  return useContext(ParceiroShellUiContext);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/** Uma vez por carga da página — reset só no reload completo. */
let partnerGreetingSmilePlayed = false;

function TypedHeroGreeting({ firstName }: { firstName: string }) {
  const playfulText = `Olá, ${firstName}.  :)`;
  const finalText = `Olá, ${firstName}!`;
  const [shown, setShown] = useState(() =>
    partnerGreetingSmilePlayed ? finalText : ""
  );
  const [typing, setTyping] = useState(() => !partnerGreetingSmilePlayed);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setShown(finalText);
      setTyping(false);
      partnerGreetingSmilePlayed = true;
      return;
    }

    if (partnerGreetingSmilePlayed) {
      setShown(finalText);
      setTyping(false);
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });

    const run = async () => {
      setTyping(true);
      let text = "";
      setShown("");

      for (let i = 1; i <= playfulText.length; i += 1) {
        if (cancelled) return;
        text = playfulText.slice(0, i);
        setShown(text);
        await wait(50);
      }

      if (cancelled) return;
      await wait(750);
      if (cancelled) return;

      const keepPrefix = `Olá, ${firstName}`;
      while (text.length > keepPrefix.length) {
        if (cancelled) return;
        text = text.slice(0, -1);
        setShown(text);
        await wait(26);
      }

      if (cancelled) return;

      for (let i = text.length + 1; i <= finalText.length; i += 1) {
        if (cancelled) return;
        text = finalText.slice(0, i);
        setShown(text);
        await wait(55);
      }

      if (cancelled) return;
      partnerGreetingSmilePlayed = true;
      await wait(700);
      if (!cancelled) setTyping(false);
    };

    void run();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [firstName, playfulText, finalText]);

  return (
    <h1 className="parceiro-portal-hero-title" aria-label={finalText}>
      <span className="parceiro-portal-hero-title-gradient" aria-hidden>
        {shown}
      </span>
      <span
        className={cn(
          "parceiro-portal-hero-title-cursor",
          !typing && "parceiro-portal-hero-title-cursor-done"
        )}
        aria-hidden
      />
    </h1>
  );
}

interface ParceiroPortalShellProps {
  partner: PartnerPortalData;
  isAdminPreview?: boolean;
  children: React.ReactNode;
  /** Foto maior no hero da página (com upload). */
  showHeroPhoto?: boolean;
  onFotoUrlChange?: (url: string) => void;
  onPartnerChange?: (profile: Partial<PartnerPortalData>) => void;
}

export default function ParceiroPortalShell({
  partner: initialPartner,
  isAdminPreview = false,
  children,
  showHeroPhoto = false,
  onFotoUrlChange,
  onPartnerChange,
}: ParceiroPortalShellProps) {
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const [partner, setPartner] = useState(initialPartner);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiPrefs, setUiPrefs] = useState<PartnerUiPrefs>(DEFAULT_PARTNER_UI_PREFS);
  const shellRef = useRef<HTMLDivElement>(null);

  const roleLabel = getPartnerRoleLabel(partner.tipo, partner.nome);

  useEffect(() => {
    setPartner(initialPartner);
  }, [initialPartner]);

  useEffect(() => {
    const loaded = loadPartnerUiPrefs(partner.id);
    setUiPrefs(loaded);
    applyPartnerUiPrefsToElement(shellRef.current, loaded);
  }, [partner.id]);

  useEffect(() => {
    applyPartnerUiPrefsToElement(shellRef.current, uiPrefs);
  }, [uiPrefs]);

  const handleUiPrefsChange = (next: PartnerUiPrefs) => {
    setUiPrefs(next);
    savePartnerUiPrefs(partner.id, next);
    applyPartnerUiPrefsToElement(shellRef.current, next);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const compressed = await compressImageFile(file, { maxDimension: 1200, quality: 0.85 });
      const form = new FormData();
      form.append("file", compressed);
      const res = await fetch("/api/parceiro/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.success || !data.fotoUrl) {
        setUploadError(data.error || "Não foi possível atualizar a foto.");
        return;
      }
      setPartner((prev) => ({ ...prev, fotoUrl: data.fotoUrl }));
      onFotoUrlChange?.(data.fotoUrl);
    } catch {
      setUploadError("Falha de conexão ao enviar a foto.");
    } finally {
      setUploading(false);
    }
  };

  const shellUi: ShellUi = {
    openInfo: () => setInfoOpen(true),
  };

  return (
    <ParceiroShellUiContext.Provider value={shellUi}>
    <div
      ref={shellRef}
      className="parceiro-portal-shell"
      data-parceiro-theme={uiPrefs.theme}
    >
      {isAdminPreview && (
        <div className="parceiro-portal-admin-banner">
          <div className="parceiro-portal-admin-banner-inner">
            <span>
              Visualização da Diretoria — portal como <strong>{partner.nome}</strong>.
            </span>
            <Link href="/parceiros" className="parceiro-portal-admin-banner-link">
              Voltar ao admin
            </Link>
          </div>
        </div>
      )}

      <header className="parceiro-portal-header">
        <div className="parceiro-portal-header-inner">
          <div className="parceiro-portal-brand">
            <img src="/logo.png" alt="Móveis Unghero" className="parceiro-portal-brand-logo" />
            <p className="parceiro-portal-brand-sub">Portal do parceiro</p>
          </div>

          <nav className="parceiro-portal-nav" aria-label="Menu do portal">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("parceiro-portal-nav-link", active && "is-active")}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="parceiro-portal-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="parceiro-portal-header-user">
            <ParceiroUserMenu
              partner={partner}
              onOpenProfile={() => setInfoOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        </div>
      </header>

      <main className="parceiro-portal-main">
        {showHeroPhoto && (
          <section className="parceiro-portal-hero">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 p-5 sm:p-6">
              <div className="relative group/avatar mx-auto sm:mx-0">
                <div className="parceiro-portal-avatar-lg">
                  {partner.fotoUrl ? (
                    <img
                      src={partner.fotoUrl}
                      alt={partner.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="parceiro-portal-avatar-fallback">
                      {getInitials(partner.nome)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="parceiro-portal-avatar-edit"
                  title="Alterar foto"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      <span>Alterar foto</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handleAvatarChange(e)}
                />
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left space-y-1.5">
                <p className="parceiro-portal-hero-eyebrow">{roleLabel}</p>
                <TypedHeroGreeting firstName={partner.nome.split(" ")[0] || "parceiro"} />
                <p className="parceiro-portal-hero-copy">
                  Seu espaço com a Móveis Unghero.
                </p>
                {uploadError && (
                  <p className="text-xs font-semibold text-rose-600">{uploadError}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {children}
      </main>

      <footer className="parceiro-portal-footer">
        <div className="parceiro-portal-footer-inner">
          <p className="parceiro-portal-footer-legal">
            © {new Date().getFullYear()} Móveis Unghero
          </p>
        </div>
      </footer>

      <ParceiroInfoModal
        open={infoOpen}
        partner={partner}
        onClose={() => setInfoOpen(false)}
        onSaved={(profile) => {
          setPartner((prev) => ({ ...prev, ...profile }));
          onPartnerChange?.(profile);
        }}
      />
      <ParceiroSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={uiPrefs}
        onChange={handleUiPrefsChange}
      />
    </div>
    </ParceiroShellUiContext.Provider>
  );
}
