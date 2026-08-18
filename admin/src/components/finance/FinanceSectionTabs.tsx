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
    <div className="section-tabs">
      {TABS.map(({ href, label, icon: Icon, iconClass }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={`section-tabs-item ${active ? "section-tabs-item-active" : ""}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
