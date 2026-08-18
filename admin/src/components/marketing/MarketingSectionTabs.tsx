"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, NotebookPen, BarChart3, MessageCircle } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import {
  canViewFullMarketing,
  canViewMarketingAnalytics,
} from "@/lib/permissions";

const TABS = [
  {
    href: "/marketing",
    label: "Avaliação Google",
    icon: Star,
    iconClass: "text-amber-500",
    fullOnly: true,
  },
  {
    href: "/marketing/formularios",
    label: "Formulários",
    icon: NotebookPen,
    iconClass: "text-sky-500",
    fullOnly: true,
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
  const showFull = canViewFullMarketing(role);

  return (
    <div className="section-tabs">
      {TABS.filter((tab) => {
        if (tab.analyticsOnly && !showAnalytics) return false;
        if (tab.fullOnly && !showFull) return false;
        return true;
      }).map(({ href, label, icon: Icon, iconClass }) => {
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
