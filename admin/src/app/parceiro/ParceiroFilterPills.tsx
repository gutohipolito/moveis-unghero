"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ParceiroFilterOption = {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
};

type Props = {
  options: ParceiroFilterOption[];
  value: string;
  onChange: (id: string) => void;
  "aria-label": string;
  className?: string;
  /** Estilo dos chips no desktop */
  variant?: "chip" | "finance";
};

/**
 * Filtros em chips no desktop; no mobile vira um select nativo (dropdown).
 */
export default function ParceiroFilterPills({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  className,
  variant = "chip",
}: Props) {
  return (
    <div className={cn("parceiro-filter-pills", className)}>
      <label className="parceiro-filter-pills-select-wrap">
        <span className="sr-only">{ariaLabel}</span>
        <select
          className="parceiro-filter-pills-select"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id} disabled={opt.disabled}>
              {opt.count != null ? `${opt.label} (${opt.count})` : opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="parceiro-filter-pills-select-icon h-4 w-4"
          aria-hidden
        />
      </label>

      <div
        className={cn(
          "parceiro-filter-pills-chips",
          variant === "finance"
            ? "parceiro-veio-finance-filters"
            : "parceiro-chip-scroll"
        )}
        role="toolbar"
        aria-label={ariaLabel}
      >
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={opt.disabled}
            aria-pressed={value === opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              variant === "finance"
                ? "parceiro-veio-finance-filter"
                : "parceiro-filter-chip",
              value === opt.id && "is-active"
            )}
          >
            <span>{opt.label}</span>
            {variant === "finance" && opt.count != null ? (
              <span className="parceiro-veio-finance-filter-count">{opt.count}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
