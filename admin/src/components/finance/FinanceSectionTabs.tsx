"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, BarChart3, Target } from "lucide-react";

const TABS = [
  { href: "/financeiro", label: "Contas a Receber", icon: ArrowDownCircle, iconClass: "text-emerald-500" },
  { href: "/financeiro/contas-a-pagar", label: "Contas a Pagar", icon: ArrowUpCircle, iconClass: "text-rose-500" },
  { href: "/financeiro/dre", label: "DRE", icon: BarChart3, iconClass: "text-amber-500" },
  { href: "/financeiro/rentabilidade", label: "Rentabilidade", icon: Target, iconClass: "text-indigo-500" },
];

export default function FinanceSectionTabs() {
  const pathname = usePathname();

  return (
    <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto p-1 bg-slate-100/80 border border-slate-200/60 rounded-xl">
      {TABS.map(({ href, label, icon: Icon, iconClass }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              active
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className={`h-4 w-4 ${iconClass}`} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
