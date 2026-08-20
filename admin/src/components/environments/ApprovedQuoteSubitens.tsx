"use client";

import { Package } from "lucide-react";

type ApprovedQuoteSubitensProps = {
  items: string[];
  /** full = bloco da ficha; preview = chips curtos no card */
  variant?: "full" | "preview";
  /** Quantos chips no preview antes de "+N". */
  previewLimit?: number;
  className?: string;
};

export default function ApprovedQuoteSubitens({
  items,
  variant = "full",
  previewLimit = 3,
  className = "",
}: ApprovedQuoteSubitensProps) {
  if (!items.length) return null;

  if (variant === "preview") {
    const visible = items.slice(0, previewLimit);
    const rest = items.length - visible.length;
    return (
      <div className={`flex flex-wrap gap-1 ${className}`.trim()}>
        {visible.map((item) => (
          <span
            key={item}
            className="inline-flex max-w-full truncate rounded-md border border-sky-200/90 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-900"
            title={item}
          >
            {item}
          </span>
        ))}
        {rest > 0 ? (
          <span className="inline-flex items-center rounded-md border border-sky-200/90 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
            +{rest}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={`rounded-xl border border-sky-200/90 bg-sky-50/70 px-3.5 py-3 space-y-2 ${className}`.trim()}
    >
      <div className="flex items-start gap-2">
        <Package className="h-3.5 w-3.5 mt-0.5 shrink-0 text-sky-700" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-900">
            Itens aprovados no orçamento
          </p>
          <p className="text-[10px] text-sky-900/75 leading-snug">
            Referência comercial deste cômodo — use para orientar insumos e execução. Sem
            valores.
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="inline-flex max-w-full rounded-md border border-sky-200 bg-white px-2 py-1 text-[11px] font-semibold text-sky-950 leading-snug"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
