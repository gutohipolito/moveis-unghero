"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, ShieldCheck, BookMarked } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";

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
  const pathname = usePathname();
  const { can } = usePermissions();
  const visible = TABS.filter((t) => can(t.moduleKey));

  if (visible.length <= 1) return null;

  return (
    <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto p-1 bg-slate-100/80 border border-slate-200/60 rounded-xl">
      {visible.map(({ href, label, icon: Icon, iconClass }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
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
