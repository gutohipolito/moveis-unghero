"use client";

import { Settings, Users, ShieldCheck, BookMarked } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import SectionNavTabs from "@/components/SectionNavTabs";

const TABS = [
  {
    href: "/settings",
    label: "Empresa",
    icon: Settings,
    iconClass: "text-slate-500",
    moduleKey: "settings",
  },
  {
    href: "/colaboradores",
    label: "Colaboradores",
    icon: Users,
    iconClass: "text-sky-500",
    moduleKey: "colaboradores",
  },
  {
    href: "/permissoes",
    label: "Permissões",
    icon: ShieldCheck,
    iconClass: "text-emerald-500",
    moduleKey: "permissoes",
  },
  {
    href: "/cadastros",
    label: "Cadastros",
    icon: BookMarked,
    iconClass: "text-amber-500",
    moduleKey: "cadastros",
  },
] as const;

export const SETTINGS_HUB_PATHS = TABS.map((t) => t.href);
export const SETTINGS_HUB_MODULES = TABS.map((t) => t.moduleKey);

/** Primeira rota do hub que o usuário pode abrir. */
export function resolveSettingsHubHref(can: (moduleKey: string) => boolean): string {
  const first = TABS.find((t) => can(t.moduleKey));
  return first?.href ?? "/settings";
}

export default function SettingsSectionTabs() {
  const { can } = usePermissions();
  const visible = TABS.filter((t) => can(t.moduleKey));

  return (
    <SectionNavTabs
      ariaLabel="Seções de configurações"
      tabs={visible.map(({ href, label, icon, iconClass }) => ({
        href,
        label,
        icon,
        iconClass,
        isActive: (pathname) => pathname === href || pathname.startsWith(`${href}/`),
      }))}
    />
  );
}
