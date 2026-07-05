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
  "Administração",
] as const;

export const NAV_ITEMS: NavItem[] = [
  { name: "Relatórios", href: "/bi", icon: LayoutDashboard, section: "Visão Geral" },

  { name: "Funil Comercial", shortName: "Funil", href: "/crm", icon: Kanban, section: "Comercial" },
  { name: "Contatos", href: "/clientes", icon: Users, section: "Comercial" },
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
];

export function isNavItemActive(pathname: string, href: string): boolean {
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

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
      {NAV_SECTIONS.map((section) => {
        const items = NAV_ITEMS.filter((i) => i.section === section);
        if (items.length === 0) return null;

        return (
          <div key={section}>
            <p className="sidebar-section-label px-2 mb-1.5">{section}</p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = isNavItemActive(pathname, item.href);
                const label = compact && item.shortName ? item.shortName : item.name;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`sidebar-nav-link ${isActive ? "sidebar-nav-link-active" : ""}`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="sidebar-nav-icon mt-0.5">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="leading-snug">{label}</span>
                    </div>
                    {item.badge && <span className="sidebar-nav-badge shrink-0">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
