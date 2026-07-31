"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, NotebookPen, BarChart3, MessageCircle } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import { canViewMarketingAnalytics } from "@/lib/permissions";

const TABS = [
  { href: "/marketing", label: "Avaliação Google", icon: Star, iconClass: "text-amber-500" },
  {
    href: "/marketing/formularios",
    label: "Formulários",
    icon: NotebookPen,
    iconClass: "text-sky-500",
  },
  {
    href: "/marketing/mensagens",
    label: "Mensagens prontas",
    icon: MessageCircle,
    iconClass: "text-emerald-600",
  },
  {
    href: "/marketing/analytics",
    label: "Tráfego GA4",
    icon: BarChart3,
    iconClass: "text-violet-500",
    analyticsOnly: true,
  },
];

export default function MarketingSectionTabs() {
  const pathname = usePathname();
  const { role } = usePermissions();
  const showAnalytics = canViewMarketingAnalytics(role);

  return (
    <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto p-1 bg-slate-100/80 border border-slate-200/60 rounded-xl">
      {TABS.filter((tab) => !tab.analyticsOnly || showAnalytics).map(
        ({ href, label, icon: Icon, iconClass }) => {
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
        }
      )}
    </div>
  );
}
