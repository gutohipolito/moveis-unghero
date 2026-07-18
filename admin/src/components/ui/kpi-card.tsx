import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  trend?: { value: React.ReactNode; positive?: boolean };
  accent?: "primary" | "success" | "warning" | "info" | "neutral";
  className?: string;
  valueClassName?: string;
}

const accentStyles = {
  primary: "bg-primary/8 text-primary border-primary/15",
  success: "bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.15)]",
  warning: "bg-[hsl(var(--warning)/0.08)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.15)]",
  info: "bg-[hsl(var(--info)/0.08)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.15)]",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "primary",
  className,
  valueClassName,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "surface-compact flex items-start gap-[var(--space-3)] p-[var(--space-3)] md:p-[var(--space-4)]",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center w-9 h-9 rounded-[var(--radius-sm)] border",
          accentStyles[accent]
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-label text-muted-foreground truncate">{label}</p>
        <p
          className={cn(
            "text-headline font-display font-bold tracking-tight text-foreground mt-0.5 truncate",
            valueClassName
          )}
        >
          {value}
        </p>
        {trend && (
          <p
            className={cn(
              "text-caption mt-0.5 font-medium",
              trend.positive ? "text-[hsl(var(--success))]" : "text-muted-foreground"
            )}
          >
            {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
