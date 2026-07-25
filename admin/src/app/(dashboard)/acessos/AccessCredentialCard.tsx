"use client";

import React, { useEffect, useState } from "react";
import {
  ACCESS_CATEGORY_STYLES,
  accessCategoryLabel,
  faviconUrlFor,
  normalizeAccessUrl,
} from "@/lib/accessCategories";
import {
  extractBrandPaletteFromImage,
  type BrandPalette,
} from "@/lib/faviconPalette";
import type { AccessCredentialDTO } from "@/app/actions/acessos";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";

function getInitials(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return title.slice(0, 2).toUpperCase() || "AC";
}

interface AccessCredentialCardProps {
  item: AccessCredentialDTO;
  index: number;
  isReadOnly: boolean;
  passwordShown: boolean;
  revealedPassword?: string;
  revealing: boolean;
  copiedUser: boolean;
  copiedPassword: boolean;
  onToggleFavorite: () => void;
  onCopyUser: () => void;
  onCopyPassword: () => void;
  onRevealToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Card isolado: paleta só após mount (evita hydration #418 com favicon em cache).
 * Tint da marca via wash borrado do favicon + ribbon com cores extraídas.
 */
export function AccessCredentialCard({
  item,
  index,
  isReadOnly,
  passwordShown,
  revealedPassword,
  revealing,
  copiedUser,
  copiedPassword,
  onToggleFavorite,
  onCopyUser,
  onCopyPassword,
  onRevealToggle,
  onEdit,
  onDelete,
}: AccessCredentialCardProps) {
  const style = ACCESS_CATEGORY_STYLES[item.categoria];
  const favicon = faviconUrlFor(item.url);
  const href = normalizeAccessUrl(item.url);

  const [faviconBroken, setFaviconBroken] = useState(false);
  const [palette, setPalette] = useState<BrandPalette | null>(null);
  const [faviconReady, setFaviconReady] = useState(false);

  const showFavicon = Boolean(favicon && !faviconBroken);

  useEffect(() => {
    if (!favicon) {
      setPalette(null);
      setFaviconReady(false);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      setFaviconReady(true);
      setFaviconBroken(false);
      // Extrai depois do paint — nunca durante a hidratação.
      requestAnimationFrame(() => {
        if (cancelled) return;
        const next = extractBrandPaletteFromImage(img);
        if (next) setPalette(next);
      });
    };
    img.onerror = () => {
      if (cancelled) return;
      setFaviconBroken(true);
      setFaviconReady(false);
      setPalette(null);
    };
    img.src = favicon;

    return () => {
      cancelled = true;
    };
  }, [favicon]);

  return (
    <article
      className={cn(
        "group/card relative overflow-hidden rounded-2xl border shadow-[var(--shadow-sm)] transition-all duration-[var(--motion-base)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
        "bg-gradient-to-br",
        style.card,
        style.glow
      )}
      style={{
        animation: "fadeInUp 0.45s var(--ease-out) both",
        animationDelay: `${Math.min(index, 8) * 40}ms`,
        ...(palette
          ? {
              borderColor: palette.border,
            }
          : undefined),
      }}
    >
      {/* Wash da marca (favicon borrado) — funciona mesmo sem canvas */}
      {showFavicon && faviconReady ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.22]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={favicon!}
              alt=""
              className="absolute -inset-[40%] h-[180%] w-[180%] max-w-none object-cover blur-3xl scale-110 saturate-150"
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/55 via-white/35 to-white/70"
          />
        </>
      ) : null}

      {/* Tarja superior */}
      <div className="relative h-1.5 w-full overflow-hidden">
        {showFavicon && faviconReady ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={favicon!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover blur-[1px] saturate-150 scale-y-[3] scale-x-110"
            />
            <div
              className="absolute inset-0"
              style={
                palette
                  ? {
                      background: `linear-gradient(90deg, ${palette.primary}cc 0%, ${palette.secondary}aa 100%)`,
                    }
                  : { background: "linear-gradient(90deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05))" }
              }
            />
          </>
        ) : (
          <div className={cn("h-full w-full bg-gradient-to-r", style.ribbon)} />
        )}
      </div>

      <div className="relative p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border overflow-hidden shadow-xs bg-white/80",
              !palette && style.icon
            )}
            style={
              palette
                ? {
                    background: palette.iconBg,
                    borderColor: `${palette.primary}40`,
                  }
                : undefined
            }
          >
            {showFavicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={favicon!}
                alt=""
                className="h-7 w-7 object-contain"
                onError={() => setFaviconBroken(true)}
              />
            ) : (
              <span className="text-sm font-black tracking-tight text-slate-700">
                {getInitials(item.titulo)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="font-extrabold text-slate-900 text-[15px] leading-tight tracking-tight truncate">
                {item.titulo}
              </h3>
              <button
                type="button"
                onClick={onToggleFavorite}
                disabled={isReadOnly}
                className={cn(
                  "shrink-0 mt-0.5 rounded-md p-0.5 transition-colors",
                  item.favorito ? "text-amber-500" : "text-slate-300 hover:text-amber-500",
                  isReadOnly && "cursor-default"
                )}
                title={item.favorito ? "Remover dos favoritos" : "Favoritar"}
              >
                <Star className={cn("h-4 w-4", item.favorito && "fill-current")} />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  !palette && style.badge
                )}
                style={
                  palette
                    ? {
                        background: palette.badgeBg,
                        color: palette.badgeText,
                        borderColor: `${palette.primary}33`,
                      }
                    : undefined
                }
              >
                {accessCategoryLabel(item.categoria)}
              </span>
              {item.hostname && (
                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[10rem]">
                  {item.hostname}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <SecretRow
            label="Usuário"
            value={item.usuario || "—"}
            canCopy={Boolean(item.usuario)}
            copied={copiedUser}
            onCopy={onCopyUser}
          />
          <SecretRow
            label="Senha"
            value={
              !item.hasPassword
                ? "Sem senha"
                : passwordShown
                  ? revealedPassword || "••••••••••••"
                  : "••••••••••••"
            }
            mono
            canCopy={item.hasPassword}
            copied={copiedPassword}
            onCopy={onCopyPassword}
            trailing={
              item.hasPassword ? (
                <button
                  type="button"
                  onClick={onRevealToggle}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/80 hover:text-slate-800 transition-colors"
                  title={
                    passwordShown
                      ? "Ocultar senha"
                      : "Revelar senha (pede senha do painel)"
                  }
                >
                  {revealing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : passwordShown ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : null
            }
          />
        </div>

        {item.notas && (
          <p className="text-[12px] text-slate-600 leading-relaxed line-clamp-2 border-t border-black/5 pt-3">
            {item.notas}
          </p>
        )}

        <div className="flex items-center gap-1.5 pt-1 border-t border-black/5">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 h-8 text-xs font-bold text-slate-700 hover:bg-white/80 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir
            </a>
          ) : null}
          <div className="flex-1" />
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-white/80 hover:text-slate-800 transition-colors"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function SecretRow({
  label,
  value,
  mono,
  canCopy,
  copied,
  onCopy,
  trailing,
}: {
  label: string;
  value: string;
  mono?: boolean;
  canCopy?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/75 border border-black/5 px-3 py-2 flex items-center gap-2 min-w-0 backdrop-blur-[2px]">
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p
          className={cn(
            "text-[13px] font-semibold text-slate-800 truncate",
            mono && "font-mono tracking-wide"
          )}
        >
          {value}
        </p>
      </div>
      {trailing}
      {canCopy && onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 transition-colors shrink-0"
          title="Copiar"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
