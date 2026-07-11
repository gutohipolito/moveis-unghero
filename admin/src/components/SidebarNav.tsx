"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Kanban,
  Calendar,
  DollarSign,
  User as UserIcon,
  Layers,
  LayoutDashboard,
  Users,
  Package,
  Truck,
  ClipboardList,
  Clock,
  BookMarked,
  PenTool,
  Star,
  BarChart3,
  NotebookPen,
  Settings,
} from "lucide-react";

export interface NavItem {
  name: string;
  shortName?: string;
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
  section: string;
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

  { name: "Avaliação Google", href: "/marketing", icon: Star, section: "Marketing" },
  { name: "Formulários", href: "/marketing/formularios", icon: NotebookPen, section: "Marketing" },
  { name: "Tráfego GA4", href: "/marketing/analytics", icon: BarChart3, section: "Marketing" },

  { name: "Funil Comercial", shortName: "Funil", href: "/crm", icon: Kanban, section: "Comercial" },
  { name: "Clientes", href: "/clientes", icon: Users, section: "Comercial" },
  { name: "Orçamentos", href: "/quotes", icon: ClipboardList, section: "Comercial" },
  { name: "Projetistas e Arquitetos", href: "/parceiros", icon: PenTool, section: "Comercial" },

  { name: "Agenda", href: "/agenda", icon: Calendar, section: "Produção" },
  { name: "Chão de Fábrica", shortName: "Fábrica", href: "/factory", icon: Layers, section: "Produção" },
  { name: "Portal do Colaborador", href: "/factory/portal", icon: Clock, section: "Produção" },

  { name: "Estoque e Fornecedores", href: "/estoque", icon: Package, section: "Logística" },
  { name: "Logística e Entrega", href: "/logistica", icon: Truck, section: "Logística" },

  { name: "Financeiro", href: "/financeiro", icon: DollarSign, section: "Administração" },
  { name: "Colaboradores", href: "/colaboradores", icon: UserIcon, section: "Administração" },
  { name: "Cadastros do Sistema", href: "/cadastros", icon: BookMarked, section: "Administração" },
  { name: "Configurações", href: "/settings", icon: Settings, section: "Administração" },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  if (href === "/factory" && pathname.startsWith("/factory/portal")) return false;
  if (href === "/marketing" && pathname.startsWith("/marketing/analytics")) return false;
  if (href === "/marketing" && pathname.startsWith("/marketing/formularios")) return false;
  return true;
}

const HEAVY_ROUTES = new Set([
  "/crm",
  "/bi",
  "/marketing",
  "/marketing/analytics",
  "/marketing/formularios",
  "/factory",
  "/financeiro",
  "/clientes",
  "/quotes",
  "/estoque",
  "/logistica",
]);

interface SidebarNavProps {
  onNavigate?: () => void;
  compact?: boolean;
}

export default function SidebarNav({ onNavigate, compact = false }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
      {NAV_SECTIONS.map((section) => {
        const items = NAV_ITEMS.filter((i) => i.section === section);
        if (items.length === 0) return null;

        return (
          <div key={section} className="space-y-1">
            {!compact && <p className="sidebar-section-label px-2 mb-1.5">{section}</p>}
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = isNavItemActive(pathname, item.href);
                const label = compact && item.shortName ? item.shortName : item.name;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={!HEAVY_ROUTES.has(item.href)}
                    onClick={onNavigate}
                    className={`sidebar-nav-link ${isActive ? "sidebar-nav-link-active" : ""} ${
                      compact ? "justify-center px-1" : ""
                    }`}
                    title={compact ? item.name : undefined}
                  >
                    <span className="sidebar-nav-icon">
                      <item.icon className="h-4.5 w-4.5" />
                    </span>
                    {!compact && <span className="sidebar-nav-label">{label}</span>}
                    {!compact && item.badge && <span className="sidebar-nav-badge shrink-0">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
            {compact && <div className="border-b border-slate-700/20 my-2 mx-2" />}
          </div>
        );
      })}
    </nav>
  );
}
