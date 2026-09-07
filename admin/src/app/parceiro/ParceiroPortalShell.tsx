"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Home,
  Menu,
  Megaphone,
  Package,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { cn } from "@/lib/utils";
import ParceiroUserMenu from "./ParceiroUserMenu";
import ParceiroBetaBanner from "./ParceiroBetaBanner";
import ParceiroAdminPreviewBanner from "./ParceiroAdminPreviewBanner";
import ParceiroTopbarClock from "./ParceiroTopbarClock";
import SuggestionFab from "@/components/melhorias/SuggestionFab";
import ParceiroInfoModal from "./painel/ParceiroInfoModal";
import ParceiroSettingsModal from "./painel/ParceiroSettingsModal";
import ParceiroAvatarModal from "./painel/ParceiroAvatarModal";
import {
  applyPartnerUiPrefsToElement,
  DEFAULT_PARTNER_UI_PREFS,
  loadPartnerUiPrefs,
  savePartnerUiPrefs,
  type PartnerUiPrefs,
} from "@/lib/partnerUiPrefs";

const NAV = [
  { href: "/parceiro/painel", label: "Início", icon: Home },
  { href: "/parceiro/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/parceiro/clientes", label: "Clientes", icon: Users },
  { href: "/parceiro/produtos", label: "Produtos", icon: Package },
  { href: "/parceiro/marketing", label: "Indicar cliente", icon: Megaphone },
  { href: "/parceiro/comissoes", label: "Comissões e recibos", icon: Wallet },
] as const;

const SIDEBAR_STORAGE = "parceiro-sidebar-collapsed";

type ShellUi = { openInfo: () => void };

const ParceiroShellUiContext = createContext<ShellUi | null>(null);

export function useParceiroShellUi() {
  return useContext(ParceiroShellUiContext);
}

function navItemsFor(partner: PartnerPortalData) {
  return NAV.filter(
    (item) => item.href !== "/parceiro/comissoes" || partner.hasIssuedReceipt
  );
}

interface ParceiroPortalShellProps {
  partner: PartnerPortalData;
  isAdminPreview?: boolean;
  children: React.ReactNode;
  /** @deprecated Hero fotográfico removido no VEIO — ignorado. */
  showHeroPhoto?: boolean;
  onFotoUrlChange?: (url: string) => void;
  onPartnerChange?: (profile: Partial<PartnerPortalData>) => void;
}

export default function ParceiroPortalShell({
  partner: initialPartner,
  isAdminPreview = false,
  children,
  onFotoUrlChange,
  onPartnerChange,
}: ParceiroPortalShellProps) {
  const pathname = usePathname();
  const [partner, setPartner] = useState(initialPartner);
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [uiPrefs, setUiPrefs] = useState<PartnerUiPrefs>(DEFAULT_PARTNER_UI_PREFS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);

  const items = navItemsFor(partner);

  useEffect(() => {
    setPartner(initialPartner);
  }, [initialPartner]);

  useEffect(() => {
    const loaded = loadPartnerUiPrefs(partner.id);
    setUiPrefs(loaded);
    applyPartnerUiPrefsToElement(shellRef.current, loaded);
    try {
      const raw = localStorage.getItem(`${SIDEBAR_STORAGE}:${partner.id}`);
      if (raw === "1") setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
  }, [partner.id]);

  useEffect(() => {
    applyPartnerUiPrefsToElement(shellRef.current, uiPrefs);
  }, [uiPrefs]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerPanelRef.current) return;
      const focusable = drawerPanelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      menuBtnRef.current?.focus();
    };
  }, [mobileNavOpen]);

  const handleUiPrefsChange = (next: PartnerUiPrefs) => {
    setUiPrefs(next);
    savePartnerUiPrefs(partner.id, next);
    applyPartnerUiPrefsToElement(shellRef.current, next);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`${SIDEBAR_STORAGE}:${partner.id}`, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const shellUi: ShellUi = {
    openInfo: () => setInfoOpen(true),
  };

  const renderNavLinks = (opts?: { collapsed?: boolean; onNavigate?: () => void }) =>
    items.map((item) => {
      const Icon = item.icon;
      const active =
        pathname === item.href || pathname.startsWith(`${item.href}/`);
      return (
        <Link
          key={item.href}
          href={item.href}
          title={item.label}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          onClick={opts?.onNavigate}
          className={cn(
            "parceiro-sidebar-link",
            active && "is-active",
            opts?.collapsed && "is-collapsed"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="parceiro-sidebar-link-label">{item.label}</span>
        </Link>
      );
    });

  return (
    <ParceiroShellUiContext.Provider value={shellUi}>
      <div
        ref={shellRef}
        className={cn(
          "parceiro-portal-shell parceiro-portal-shell--veio",
          sidebarCollapsed && "is-sidebar-collapsed"
        )}
        data-parceiro-theme={uiPrefs.theme}
      >
        <a href="#parceiro-conteudo" className="parceiro-skip-link">
          Pular para o conteúdo
        </a>

        <div className="parceiro-portal-chrome">
          <ParceiroBetaBanner />
          {isAdminPreview ? <ParceiroAdminPreviewBanner partnerNome={partner.nome} /> : null}
        </div>

        <div className="parceiro-portal-layout">
          <aside
            className={cn(
              "parceiro-sidebar",
              sidebarCollapsed && "is-collapsed"
            )}
            aria-label="Navegação do portal"
          >
            <div className="parceiro-sidebar-top">
              <Link
                href="/parceiro/painel"
                className="parceiro-sidebar-brand"
                aria-label="Ir para o início"
              >
                {sidebarCollapsed ? (
                  <span className="parceiro-sidebar-mu" aria-hidden>
                    MU
                  </span>
                ) : (
                  <img
                    src="/logo.png"
                    alt="Móveis Unghero"
                    className="parceiro-sidebar-logo"
                  />
                )}
              </Link>
              <button
                type="button"
                className="parceiro-sidebar-toggle"
                onClick={toggleSidebar}
                aria-expanded={!sidebarCollapsed}
                aria-label={
                  sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"
                }
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>

            <nav className="parceiro-sidebar-nav">
              {renderNavLinks({ collapsed: sidebarCollapsed })}
            </nav>
          </aside>

          <div className="parceiro-portal-content">
            <header className="parceiro-topbar">
              <div className="parceiro-topbar-start">
                <button
                  ref={menuBtnRef}
                  type="button"
                  className="parceiro-mobile-menu-btn"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Abrir menu"
                  aria-expanded={mobileNavOpen}
                  aria-controls="parceiro-mobile-drawer"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <ParceiroTopbarClock />
              </div>
              <ParceiroUserMenu
                partner={partner}
                onOpenProfile={() => setInfoOpen(true)}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </header>

            <main id="parceiro-conteudo" className="parceiro-portal-main" tabIndex={-1}>
              {children}
            </main>

            <footer className="parceiro-portal-footer">
              <div className="parceiro-portal-footer-inner">
                <p className="parceiro-portal-footer-legal">
                  © {new Date().getFullYear()} Móveis Unghero
                </p>
              </div>
            </footer>
          </div>
        </div>

        {mobileNavOpen ? (
          <div
            id="parceiro-mobile-drawer"
            className="parceiro-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <button
              type="button"
              className="parceiro-mobile-drawer-backdrop"
              aria-label="Fechar menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <div ref={drawerPanelRef} className="parceiro-mobile-drawer-panel">
              <div className="parceiro-mobile-drawer-head">
                <img src="/logo.png" alt="Móveis Unghero" className="parceiro-mobile-logo" />
                <button
                  ref={drawerCloseRef}
                  type="button"
                  className="parceiro-mobile-menu-btn"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="parceiro-mobile-drawer-nav">
                {renderNavLinks({ onNavigate: () => setMobileNavOpen(false) })}
              </nav>
            </div>
          </div>
        ) : null}

        <SuggestionFab audience="partner" className="parceiro-suggestion-fab" />

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
