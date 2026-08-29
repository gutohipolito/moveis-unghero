"use client";

import { usePathname } from "next/navigation";
import {
  Kanban,
  Calendar,
  DollarSign,
  Layers,
  LayoutDashboard,
  Users,
  Package,
  Truck,
  ClipboardList,
  PenTool,
  PackageOpen,
  Star,
  Settings,
  ChevronDown,
  Lightbulb,
  FileSignature,
  Images,
  KeyRound,
  ScrollText,
  Mail,
} from "lucide-react";
import { useSidebarSections } from "@/lib/useSidebarSections";
import { usePermissions } from "@/context/PermissionsContext";
import { moduleKeyForHref } from "@/lib/permissions";
import AppNavLink from "@/components/AppNavLink";
import {
  SETTINGS_HUB_MODULES,
  SETTINGS_HUB_PATHS,
  resolveSettingsHubHref,
} from "@/components/settings/SettingsSectionTabs";

export interface NavItem {
  name: string;
  shortName?: string;
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
  section: string;
  /** Se definido, o item aparece se o usuário puder acessar qualquer um desses módulos. */
  moduleKeys?: string[];
  /** Rotas que mantêm este item ativo no menu (hubs com abas internas). */
  matchPaths?: string[];
}

/** Ordem das seções no menu lateral — agrupamento didático para o operador. */
export const NAV_SECTIONS = [
  "Visão Geral",
  "Comercial",
  "Produção",
  "Logística",
  "Marketing",
  "Administração",
] as const;

export const NAV_ITEMS: NavItem[] = [
  { name: "Relatórios", href: "/bi", icon: LayoutDashboard, section: "Visão Geral" },
  { name: "Melhorias", href: "/melhorias", icon: Lightbulb, section: "Visão Geral" },
  {
    name: "Notas da versão",
    shortName: "Notas",
    href: "/notas-da-versao",
    icon: ScrollText,
    section: "Visão Geral",
  },

  { name: "Marketing", href: "/marketing", icon: Star, section: "Marketing" },

  { name: "Funil Comercial", shortName: "Funil", href: "/crm", icon: Kanban, section: "Comercial" },
  { name: "Clientes", href: "/clientes", icon: Users, section: "Comercial" },
  { name: "Orçamentos", href: "/quotes", icon: ClipboardList, section: "Comercial" },
  { name: "Produtos", href: "/produtos", icon: Images, section: "Comercial" },
  { name: "Contratos", href: "/contratos", icon: FileSignature, section: "Comercial" },
  { name: "Projetistas e Arquitetos", href: "/parceiros", icon: PenTool, section: "Comercial" },

  { name: "Agenda", href: "/agenda", icon: Calendar, section: "Produção" },
  { name: "Chão de Fábrica", shortName: "Fábrica", href: "/factory", icon: Layers, section: "Produção" },
  { name: "Chamados", href: "/chamados", icon: PackageOpen, section: "Produção" },

  { name: "Estoque e Fornecedores", href: "/estoque", icon: Package, section: "Logística" },
  { name: "Logística e Entrega", href: "/logistica", icon: Truck, section: "Logística" },

  { name: "Financeiro", href: "/financeiro", icon: DollarSign, section: "Administração" },
  { name: "E-mails", href: "/emails", icon: Mail, section: "Administração" },
  { name: "Acessos", href: "/acessos", icon: KeyRound, section: "Administração" },
  {
    name: "Configurações",
    href: "/settings",
    icon: Settings,
    section: "Administração",
    moduleKeys: [...SETTINGS_HUB_MODULES],
    matchPaths: [...SETTINGS_HUB_PATHS],
  },
];

export function isNavItemActive(
  pathname: string,
  href: string,
  matchPaths?: string[]
): boolean {
  if (matchPaths?.length) {
    return matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  if (href === "/factory" && pathname.startsWith("/factory/portal")) return false;
  return true;
}

interface SidebarNavProps {
  onNavigate?: () => void;
  compact?: boolean;
}

export default function SidebarNav({ onNavigate, compact = false }: SidebarNavProps) {
  const pathname = usePathname();
  const { isSectionCollapsed, toggleSection } = useSidebarSections();
  const { can, isReadOnly } = usePermissions();

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
      {NAV_SECTIONS.map((section) => {
        const items = NAV_ITEMS.filter((i) => {
          if (i.section !== section) return false;
          if (i.moduleKeys?.length) return i.moduleKeys.some((k) => can(k));
          return can(moduleKeyForHref(i.href));
        });
        if (items.length === 0) return null;

        // O recolhimento por seção só se aplica ao sidebar expandido.
        const sectionCollapsed = !compact && isSectionCollapsed(section);

        return (
          <div key={section} className="space-y-1">
            {!compact && (
              <button
                type="button"
                onClick={() => toggleSection(section)}
                className="w-full flex items-center justify-between gap-2 px-2 mb-1.5 rounded-md py-1 hover:bg-slate-700/10 transition-colors cursor-pointer group"
                aria-expanded={!sectionCollapsed}
                title={sectionCollapsed ? `Mostrar ${section}` : `Ocultar ${section}`}
              >
                <span className="sidebar-section-label">{section}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-500 ${
                    sectionCollapsed ? "-rotate-90" : ""
                  }`}
                />
              </button>
            )}
            {!sectionCollapsed && (
            <div className="space-y-0.5">
              {items.map((item) => {
                const href =
                  item.href === "/settings" ? resolveSettingsHubHref(can) : item.href;
                const isActive = isNavItemActive(pathname, href, item.matchPaths);
                const label = compact && item.shortName ? item.shortName : item.name;
                    const blurLabel = isReadOnly && item.href === "/melhorias";

                return (
                  <AppNavLink
                    key={item.href}
                    href={href}
                    onClick={onNavigate}
                    className={`sidebar-nav-link ${isActive ? "sidebar-nav-link-active" : ""} ${
                      compact ? "justify-center px-1" : ""
                    }`}
                    title={compact ? item.name : undefined}
                  >
                    <span className={`sidebar-nav-icon ${blurLabel ? "blur-[2px]" : ""}`}>
                      <item.icon className="h-4.5 w-4.5" />
                    </span>
                    {!compact && (
                      <span className={`sidebar-nav-label ${blurLabel ? "blur-[3px] select-none" : ""}`}>
                        {label}
                      </span>
                    )}
                    {!compact && item.badge && <span className="sidebar-nav-badge shrink-0">{item.badge}</span>}
                  </AppNavLink>
                );
              })}
            </div>
            )}
            {compact && <div className="border-b border-slate-700/20 my-2 mx-2" />}
          </div>
        );
      })}
    </nav>
  );
}
