"use client";

import type { ReactNode } from "react";

/** Blur sutil (ilegível de longe, sem “borrar” demais a tela). */
export const VIEWER_BLUR_CLASS = "blur-[3px]";

/**
 * Para VIEWER: mostra o primeiro nome e aplica blur sutil no restante.
 * Preferir dados já redigidos no servidor (`João ••••`) — o blur é reforço visual.
 */
export function BlurSurnameName({
  name,
  enabled,
  className,
}: {
  name: string;
  enabled: boolean;
  className?: string;
}) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return <span className={className}>—</span>;
  }
  if (!enabled) {
    return <span className={className}>{trimmed}</span>;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return <span className={className}>{parts[0]}</span>;
  }

  const first = parts[0]!;
  const rest = parts.slice(1).join(" ");

  return (
    <span className={className} title={first}>
      <span>{first} </span>
      <span
        className={`${VIEWER_BLUR_CLASS} select-none pointer-events-none`}
        aria-hidden
      >
        {rest}
      </span>
    </span>
  );
}

/** Envelope com blur visual sutil (conteúdo ilegível, sem interação). */
export function ViewerBlurBox({
  enabled,
  children,
  className = "",
}: {
  enabled: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <div
      className={`${VIEWER_BLUR_CLASS} select-none pointer-events-none ${className}`}
      aria-hidden
    >
      {children}
    </div>
  );
}
