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
} from "lucide-react";

export interface NavItem {
  name: string;
  shortName?: string;
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
  section: string;
}

export const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard / BI", shortName: "Dashboard", href: "/bi", icon: LayoutDashboard, section: "Principal" },
  { name: "CRM / Projetos", shortName: "CRM", href: "/crm", icon: Kanban, section: "Principal" },
  { name: "Orçamentos", href: "/quotes", icon: ClipboardList, section: "Principal" },
  { name: "Clientes & Leads", shortName: "Clientes", href: "/clientes", icon: Users, section: "Principal" },
  { name: "Colaboradores", href: "/colaboradores", icon: UserIcon, section: "Principal" },
  { name: "Agenda", href: "/agenda", icon: Calendar, section: "Operacional" },
  { name: "Chão de Fábrica", shortName: "Fábrica", href: "/factory", icon: Layers, section: "Operacional" },
  { name: "Portal do Colaborador", shortName: "Portal RH", href: "/factory/portal", icon: Clock, section: "Operacional" },
  { name: "Estoque & Fornecedores", shortName: "Estoque", href: "/estoque", icon: Package, section: "Operacional" },
  { name: "Logística & Entrega", shortName: "Logística", href: "/logistica", icon: Truck, section: "Operacional" },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign, section: "Financeiro" },
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
  const sections = [...new Set(NAV_ITEMS.map((i) => i.section))];

  return (
    <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
      {sections.map((section) => (
        <div key={section}>
          <p className="sidebar-section-label px-2 mb-1.5">{section}</p>
          <div className="space-y-0.5">
            {NAV_ITEMS.filter((i) => i.section === section).map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const label = compact && item.shortName ? item.shortName : item.name;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onNavigate}
                  className={`sidebar-nav-link ${isActive ? "sidebar-nav-link-active" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="sidebar-nav-icon">
                      <item.icon
                        className="h-4 w-4"
                        style={{ color: isActive ? "hsl(28 85% 35%)" : "hsl(28 85% 45%)" }}
                      />
                    </div>
                    <span className="truncate">{label}</span>
                  </div>
                  {item.badge && <span className="sidebar-nav-badge">{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
