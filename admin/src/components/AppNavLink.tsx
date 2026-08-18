"use client";

import type { MouseEvent, ReactNode } from "react";
import { navigateApp } from "@/lib/navigateApp";

type AppNavLinkProps = {
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
};

/**
 * Link do chrome do painel. Usa recarregamento completo para nunca
 * ficar preso numa tela pesada (ficha de cliente/projeto).
 */
export default function AppNavLink({
  href,
  className,
  title,
  children,
  onClick,
  "aria-label": ariaLabel,
}: AppNavLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;
    event.preventDefault();
    onClick?.();
    navigateApp(href);
  }

  return (
    <a href={href} className={className} title={title} aria-label={ariaLabel} onClick={handleClick}>
      {children}
    </a>
  );
}
