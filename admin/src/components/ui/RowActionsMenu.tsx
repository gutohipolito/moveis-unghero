"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RowActionItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  target?: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
};

const TONE_CLASS: Record<NonNullable<RowActionItem["tone"]>, string> = {
  default: "text-slate-700 hover:bg-slate-50",
  success: "text-emerald-700 hover:bg-emerald-50",
  warning: "text-amber-800 hover:bg-amber-50",
  danger: "text-rose-600 hover:bg-rose-50",
  muted: "text-slate-400 cursor-not-allowed",
};

interface RowActionsMenuProps {
  items: RowActionItem[];
  label?: string;
  align?: "start" | "end";
  className?: string;
}

export default function RowActionsMenu({
  items,
  label = "Ações",
  align = "end",
  className,
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuWidth = 220;
      const pad = 8;
      let left =
        align === "end" ? rect.right - menuWidth : rect.left;
      left = Math.max(pad, Math.min(left, window.innerWidth - menuWidth - pad));
      const estimatedHeight = Math.min(items.length * 40 + 16, 320);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimatedHeight + 12 && rect.top > spaceBelow;
      const top = openUp
        ? Math.max(pad, rect.top - estimatedHeight - 6)
        : rect.bottom + 6;
      setPos({ top, left });
    };

    place();
    const onScroll = () => place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open, align, items.length]);

  if (items.length === 0) return null;

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label={label}
      className="fixed z-[9999] w-[220px] rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      {items.map((item) => {
        const tone = item.disabled ? "muted" : item.tone || "default";
        const classNameItem = cn(
          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium transition-colors",
          TONE_CLASS[tone]
        );
        const content = (
          <>
            {item.icon ? (
              <span className="shrink-0 opacity-80">{item.icon}</span>
            ) : null}
            <span className="min-w-0 truncate">{item.label}</span>
          </>
        );

        if (item.href && !item.disabled) {
          return (
            <a
              key={item.key}
              role="menuitem"
              href={item.href}
              target={item.target}
              rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
              className={classNameItem}
              onClick={() => setOpen(false)}
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={classNameItem}
            onClick={() => {
              if (item.disabled) return;
              setOpen(false);
              item.onClick?.();
            }}
          >
            {content}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={cn("relative inline-flex", className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 px-0 border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
