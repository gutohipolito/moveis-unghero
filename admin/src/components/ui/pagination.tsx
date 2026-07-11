"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

function getPageItems(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < totalPages - 2) pages.push("…");
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 20, 30, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = "itens",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  const pageItems = getPageItems(current, totalPages);

  const baseBtn =
    "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3 sm:items-center">
      {/* Esquerda: contador */}
      <p className="order-3 sm:order-1 text-[11px] font-semibold text-muted-foreground text-center sm:text-left">
        Mostrando {start}–{end} de {total} {itemLabel}
      </p>

      {/* Centro: navegação de páginas */}
      <div className="order-1 sm:order-2 flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
          className={`${baseBtn} border border-border bg-white text-slate-600 hover:bg-slate-50`}
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageItems.map((item, idx) =>
          item === "…" ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`${baseBtn} border ${
                item === current
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(current + 1)}
          disabled={current >= totalPages}
          className={`${baseBtn} border border-border bg-white text-slate-600 hover:bg-slate-50`}
          title="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Direita: itens por página */}
      <div className="order-2 sm:order-3 flex items-center justify-center sm:justify-end gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Itens por página</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 bg-white border border-border rounded-lg text-xs font-bold px-2 text-slate-700 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default Pagination;
