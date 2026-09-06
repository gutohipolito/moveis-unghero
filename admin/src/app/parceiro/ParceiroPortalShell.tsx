"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Home, Package, Users, Megaphone, FolderKanban, Wallet } from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { getPartnerRoleLabel } from "@/lib/partnerTypes";
import {
  buildPartnerProjectAttention,
  partnerProjectIsActive,
} from "@/lib/partnerProjectLabels";
import { cn } from "@/lib/utils";
import ParceiroUserMenu from "./ParceiroUserMenu";
import ParceiroBetaBanner from "./ParceiroBetaBanner";
import SuggestionFab from "@/components/melhorias/SuggestionFab";
import ParceiroInfoModal from "./painel/ParceiroInfoModal";
import ParceiroSettingsModal from "./painel/ParceiroSettingsModal";
import ParceiroAvatarModal from "./painel/ParceiroAvatarModal";
import { exitPartnerAdminPreview } from "@/app/actions/parceiroPortal";
import {
  applyPartnerUiPrefsToElement,
  DEFAULT_PARTNER_UI_PREFS,
  loadPartnerUiPrefs,
  savePartnerUiPrefs,
  type PartnerUiPrefs,
} from "@/lib/partnerUiPrefs";

const NAV = [
  { href: "/parceiro/painel", label: "Início", shortLabel: "Início", icon: Home },
  { href: "/parceiro/projetos", label: "Projetos", shortLabel: "Projetos", icon: FolderKanban },
  { href: "/parceiro/produtos", label: "Produtos", shortLabel: "Produtos", icon: Package },
  { href: "/parceiro/clientes", label: "Clientes", shortLabel: "Clientes", icon: Users },
  { href: "/parceiro/comissoes", label: "Comissões", shortLabel: "Comiss.", icon: Wallet },
  { href: "/parceiro/marketing", label: "Marketing", shortLabel: "Mkt", icon: Megaphone },
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
  const [partner, setPartner] = useState(initialPartner);
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [uiPrefs, setUiPrefs] = useState<PartnerUiPrefs>(DEFAULT_PARTNER_UI_PREFS);
  const shellRef = useRef<HTMLDivElement>(null);

  const roleLabel = getPartnerRoleLabel(partner.tipo, partner.nome);
  const activeProjects = partner.projects.filter((p) =>
    partnerProjectIsActive(p.status_geral)
  ).length;
  const attentionCount = buildPartnerProjectAttention(partner.projects).length;
  const heroStatus =
    attentionCount > 0
      ? `${attentionCount} para acompanhar`
      : activeProjects > 0
        ? `${activeProjects} projeto${activeProjects === 1 ? "" : "s"} em andamento`
        : "Comece convidando um cliente";

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
      <div className="parceiro-portal-chrome">
        <ParceiroBetaBanner />
        {isAdminPreview && (
          <div className="parceiro-portal-admin-banner">
            <div className="parceiro-portal-admin-banner-inner">
              <span>
                Visualização da Diretoria — portal como <strong>{partner.nome}</strong>
                {" "}(expira em 45 min).
              </span>
              <form action={exitPartnerAdminPreview}>
                <button type="submit" className="parceiro-portal-admin-banner-link">
                  Voltar ao admin
                </button>
              </form>
            </div>
          </div>
        )}

        <header className="parceiro-portal-header">
        <div className="parceiro-portal-header-inner">
          <div className="parceiro-portal-brand">
            <Link href="/parceiro/painel" className="parceiro-portal-brand-link" aria-label="Ir para o início">
              <img src="/logo.png" alt="Móveis Unghero" className="parceiro-portal-brand-logo" />
            </Link>
            <p className="parceiro-portal-brand-sub">Portal do parceiro</p>
          </div>

          <nav className="parceiro-portal-nav parceiro-portal-nav--top" aria-label="Menu do portal">
            {NAV.filter(
              (item) =>
                item.href !== "/parceiro/comissoes" || partner.hasCommissions
            ).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  className={cn("parceiro-portal-nav-link", active && "is-active")}
                >
                  <Icon className="h-4 w-4 shrink-0" />
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
      </div>

      <main className="parceiro-portal-main">
        {showHeroPhoto && (
          <section className="parceiro-portal-hero">
            <div className="parceiro-portal-hero-media" aria-hidden />
            <div className="parceiro-portal-hero-veil" aria-hidden />
            <div className="parceiro-portal-hero-inner">
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
                  onClick={() => setAvatarOpen(true)}
                  className="parceiro-portal-avatar-edit"
                  title="Alterar foto"
                >
                  <Camera className="h-4 w-4" />
                  <span>Alterar foto</span>
                </button>
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left space-y-1.5">
                <p className="parceiro-portal-hero-eyebrow">{roleLabel}</p>
                <TypedHeroGreeting firstName={partner.nome.split(" ")[0] || "parceiro"} />
                <p className="parceiro-portal-hero-copy">
                  Seu espaço com a Móveis Unghero.
                </p>
                <p className="parceiro-portal-hero-status">{heroStatus}</p>
              </div>
            </div>
          </section>
        )}

        {children}
      </main>

      <SuggestionFab audience="partner" />

      <nav className="parceiro-portal-nav-bottom" aria-label="Menu principal">
        {NAV.filter(
          (item) =>
            item.href !== "/parceiro/comissoes" || partner.hasCommissions
        ).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn("parceiro-portal-nav-bottom-link", active && "is-active")}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>

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
        showOnQuote={partner.showOnQuote}
        onShowOnQuoteChange={(show) => {
          setPartner((prev) => ({ ...prev, showOnQuote: show }));
          onPartnerChange?.({ showOnQuote: show });
        }}
      />
      <ParceiroAvatarModal
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        currentFotoUrl={partner.fotoUrl}
        partnerName={partner.nome}
        onUploaded={(fotoUrl) => {
          setPartner((prev) => ({ ...prev, fotoUrl }));
          onFotoUrlChange?.(fotoUrl);
        }}
      />
    </div>
    </ParceiroShellUiContext.Provider>
  );
}
