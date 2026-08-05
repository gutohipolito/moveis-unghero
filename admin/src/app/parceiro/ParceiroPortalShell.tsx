"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Loader2, LogOut, LayoutDashboard, Package, Users, Megaphone } from "lucide-react";
import { logoutParceiro } from "@/app/actions/parceiroPortal";
import type { PartnerPortalData } from "@/lib/partnerPortal";
import { getPartnerRoleLabel } from "@/lib/partnerTypes";
import { Button } from "@/components/ui/button";
import { compressImageFile } from "@/lib/imageCompression";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/parceiro/painel", label: "Início", icon: LayoutDashboard },
  { href: "/parceiro/produtos", label: "Produtos", icon: Package },
  { href: "/parceiro/clientes", label: "Clientes", icon: Users },
  { href: "/parceiro/marketing", label: "Marketing", icon: Megaphone },
] as const;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function TypedHeroGreeting({ firstName }: { firstName: string }) {
  const fullText = `Olá, ${firstName}`;
  const [shown, setShown] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setShown(fullText);
      setTyping(false);
      return;
    }

    setShown("");
    setTyping(true);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(fullText.slice(0, i));
      if (i >= fullText.length) {
        window.clearInterval(id);
        window.setTimeout(() => setTyping(false), 900);
      }
    }, 52);

    return () => window.clearInterval(id);
  }, [fullText]);

  return (
    <h1 className="parceiro-portal-hero-title" aria-label={fullText}>
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
}

export default function ParceiroPortalShell({
  partner: initialPartner,
  isAdminPreview = false,
  children,
  showHeroPhoto = false,
  onFotoUrlChange,
}: ParceiroPortalShellProps) {
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const [partner, setPartner] = useState(initialPartner);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const roleLabel = getPartnerRoleLabel(partner.tipo, partner.nome);

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

  return (
    <div className="parceiro-portal-shell">
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
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex flex-col items-end min-w-0 mr-1">
              <span className="text-xs font-semibold text-white truncate max-w-[9rem]">
                {partner.nome.split(" ")[0]}
              </span>
              <span className="text-[10px] text-white/55 truncate max-w-[9rem]">{roleLabel}</span>
            </div>
            <form action={logoutParceiro}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="gap-1.5 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isAdminPreview ? "Sair" : "Sair"}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="parceiro-portal-main">
        {showHeroPhoto && (
          <section className="parceiro-portal-hero">
            <div className="parceiro-portal-hero-accent" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 p-5 sm:p-7">
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

              <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
                <p className="parceiro-portal-hero-eyebrow">{roleLabel}</p>
                <TypedHeroGreeting firstName={partner.nome.split(" ")[0] || "parceiro"} />
                <p className="parceiro-portal-hero-copy">
                  Acompanhe seus projetos e o catálogo da Móveis Unghero neste espaço.
                </p>
                {uploadError && (
                  <p className="text-xs font-semibold text-rose-600">{uploadError}</p>
                )}
                <p className="text-[11px] text-slate-500">
                  Clique em Alterar foto para atualizar sua imagem de perfil.
                </p>
              </div>
            </div>
          </section>
        )}

        {children}
      </main>
    </div>
  );
}
