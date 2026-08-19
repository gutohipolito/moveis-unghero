"use client";

import { Star, NotebookPen, BarChart3, MessageCircle } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import {
  canViewFullMarketing,
  canViewMarketingAnalytics,
} from "@/lib/permissions";
import SectionNavTabs from "@/components/SectionNavTabs";

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
  const { role } = usePermissions();
  const showAnalytics = canViewMarketingAnalytics(role);
  const showFull = canViewFullMarketing(role);

  return (
    <SectionNavTabs
      ariaLabel="Seções de marketing"
      tabs={TABS.filter((tab) => {
        if (tab.analyticsOnly && !showAnalytics) return false;
        if (tab.fullOnly && !showFull) return false;
        return true;
      }).map(({ href, label, icon, iconClass }) => ({
        href,
        label,
        icon,
        iconClass,
      }))}
    />
  );
}
