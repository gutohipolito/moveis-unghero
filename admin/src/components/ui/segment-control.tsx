"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  badge?: number;
}

interface SegmentControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
  "aria-label"?: string;
}

export function SegmentControl<T extends string>({
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
}: SegmentControlProps<T>) {
  return (
    <div
      className={cn("segment-control", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn("segment-control-item", active && "segment-control-item-active")}
          >
            {opt.label}
            {opt.badge != null && opt.badge > 0 && (
              <span className="segment-control-badge">{opt.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
