"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  AlignLeft,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  RemoveFormatting,
  Strikethrough,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  onPickFiles?: (files: FileList | null) => void;
  className?: string;
  minHeightClassName?: string;
  disabled?: boolean;
};

function runCommand(command: string, value?: string) {
  try {
    document.execCommand(command, false, value);
  } catch {
    /* ignore unsupported commands */
  }
}

function ToolbarButton({
  title,
  onClick,
  children,
  active,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-foreground transition-colors",
        active && "bg-slate-100 text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/** Editor de mensagem estilo Gmail (contentEditable + toolbar). */
export default function EmailRichEditor({
  valueHtml,
  onChangeHtml,
  onPickFiles,
  className,
  minHeightClassName = "min-h-[220px]",
  disabled,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastExternal = useRef(valueHtml);

  useEffect(() => {
    if (!ref.current) return;
    if (valueHtml === lastExternal.current) return;
    if (ref.current.innerHTML !== valueHtml) {
      ref.current.innerHTML = valueHtml || "";
    }
    lastExternal.current = valueHtml;
  }, [valueHtml]);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastExternal.current = html;
    onChangeHtml(html);
  }, [onChangeHtml]);

  const cmd = (command: string, value?: string) => {
    ref.current?.focus();
    runCommand(command, value);
    emit();
  };

  const insertLink = () => {
    const url = window.prompt("URL do link:", "https://");
    if (!url) return;
    cmd("createLink", url);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-white overflow-hidden flex flex-col",
        className
      )}
    >
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label="Mensagem"
        className={cn(
          "flex-1 px-4 py-3 text-sm text-foreground outline-none overflow-y-auto",
          "font-[family-name:var(--font-body)] leading-relaxed",
          "[&_a]:text-primary [&_a]:underline",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
          minHeightClassName,
          disabled && "opacity-60 pointer-events-none"
        )}
        onInput={emit}
        onBlur={emit}
      />

      <div className="border-t border-border/60 bg-slate-50/80 px-2 py-1.5 flex flex-wrap items-center gap-0.5">
        <select
          className="h-8 rounded-md border-0 bg-transparent px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer outline-none"
          defaultValue="Plus Jakarta Sans"
          title="Fonte"
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => cmd("fontName", e.target.value)}
        >
          <option value="Plus Jakarta Sans">Sans Serif</option>
          <option value="Outfit">Outfit</option>
          <option value="Georgia">Serif</option>
          <option value="monospace">Mono</option>
        </select>
        <select
          className="h-8 rounded-md border-0 bg-transparent px-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer outline-none"
          defaultValue="3"
          title="Tamanho"
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => cmd("fontSize", e.target.value)}
        >
          <option value="2">Pequeno</option>
          <option value="3">Normal</option>
          <option value="4">Grande</option>
          <option value="5">Enorme</option>
        </select>
        <span className="mx-1 h-5 w-px bg-border/70" />
        <ToolbarButton title="Negrito" onClick={() => cmd("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Itálico" onClick={() => cmd("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Sublinhado" onClick={() => cmd("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Tachado" onClick={() => cmd("strikeThrough")}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <label className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer" title="Cor do texto">
          <span className="text-[11px] font-bold border-b-2 border-foreground leading-none">A</span>
          <input
            type="color"
            className="sr-only"
            defaultValue="#29231f"
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => cmd("foreColor", e.target.value)}
          />
        </label>
        <span className="mx-1 h-5 w-px bg-border/70" />
        <ToolbarButton title="Alinhar à esquerda" onClick={() => cmd("justifyLeft")}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" onClick={() => cmd("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Lista com marcadores" onClick={() => cmd("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Citação" onClick={() => cmd("formatBlock", "blockquote")}>
          <span className="text-sm font-serif leading-none">”</span>
        </ToolbarButton>
        <ToolbarButton title="Limpar formatação" onClick={() => cmd("removeFormat")}>
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border/70" />
        <ToolbarButton title="Inserir link" onClick={insertLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        {onPickFiles && (
          <>
            <ToolbarButton title="Anexar arquivo" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-3.5 w-3.5" />
            </ToolbarButton>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

/** Extrai texto puro do HTML do editor. */
export function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return (el.innerText || el.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

export function plainTextToEditorHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}
