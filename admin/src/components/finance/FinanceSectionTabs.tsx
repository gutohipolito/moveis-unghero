"use client";

import { ArrowDownCircle, ArrowUpCircle, BarChart3, Target } from "lucide-react";
import SectionNavTabs from "@/components/SectionNavTabs";

const TABS = [
  { href: "/financeiro", label: "Contas a Receber", icon: ArrowDownCircle, iconClass: "text-emerald-500" },
  { href: "/financeiro/contas-a-pagar", label: "Contas a Pagar", icon: ArrowUpCircle, iconClass: "text-rose-500" },
  { href: "/financeiro/dre", label: "DRE", icon: BarChart3, iconClass: "text-amber-500" },
  { href: "/financeiro/rentabilidade", label: "Rentabilidade", icon: Target, iconClass: "text-indigo-500" },
];

export default function FinanceSectionTabs() {
  return (
    <SectionNavTabs
      ariaLabel="Seções financeiras"
      tabs={TABS}
    />
  );
}
