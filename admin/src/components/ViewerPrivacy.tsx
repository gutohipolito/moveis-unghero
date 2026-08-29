"use client";

import type { ReactNode } from "react";

/**
 * Para VIEWER: mostra o primeiro nome e aplica blur no restante (sobrenome / razão social).
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
      <span className="blur-[6px] select-none pointer-events-none" aria-hidden>
        {rest}
      </span>
    </span>
  );
}

/** Envelope com blur visual (conteúdo ilegível, sem interação). */
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
      className={`blur-[6px] select-none pointer-events-none ${className}`}
      aria-hidden
    >
      {children}
    </div>
  );
}
