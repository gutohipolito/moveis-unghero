"use client";

import { ChevronDown } from "lucide-react";

export type FilterPillOption<T extends string> = {
  value: T;
  label: string;
};

type FilterPillsProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: FilterPillOption<T>[];
  ariaLabel: string;
  variant?: "pills" | "segmented";
};

/** Pills no desktop; dropdown no celular para filtros/páginas. */
export default function FilterPills<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  variant = "pills",
}: FilterPillsProps<T>) {
  return (
    <>
      <div className="relative sm:hidden">
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none bg-white border border-border rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      {variant === "segmented" ? (
        <div className="hidden sm:block">
          <div className="section-tabs" role="group" aria-label={ariaLabel}>
            {options.map((option) => {
              const active = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={`section-tabs-item ${active ? "section-tabs-item-active" : ""}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="hidden sm:flex flex-wrap gap-1.5"
          role="group"
          aria-label={ariaLabel}
        >
          {options.map((option) => {
            const active = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
