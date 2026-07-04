"use client";

import React from "react";
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
  Clock
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string;
  section: string;
}

export const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard / BI", href: "/bi", icon: LayoutDashboard, section: "Principal" },
  { name: "CRM / Projetos", href: "/crm", icon: Kanban, section: "Principal" },
  { name: "Orçamentos", href: "/quotes", icon: ClipboardList, section: "Principal" },
  { name: "Clientes & Leads", href: "/clientes", icon: Users, section: "Principal" },
  { name: "Colaboradores", href: "/colaboradores", icon: UserIcon, section: "Principal" },
  { name: "Agenda", href: "/agenda", icon: Calendar, section: "Operacional" },
  { name: "Chão de Fábrica", href: "/factory", icon: Layers, section: "Operacional" },
  { name: "Portal do Colaborador", href: "/factory/portal", icon: Clock, section: "Operacional" },
  { name: "Estoque & Fornecedores", href: "/estoque", icon: Package, section: "Operacional" },
  { name: "Logística & Entrega", href: "/logistica", icon: Truck, section: "Operacional" },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign, section: "Financeiro" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const sections = [...new Set(NAV_ITEMS.map(i => i.section))];

  return (
    <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-5">
      {sections.map(section => (
        <div key={section}>
          <p className="text-[10px] font-black uppercase tracking-widest px-2 mb-2"
            style={{ color: "hsl(210 10% 60%)" }}>
            {section}
          </p>
          <div className="space-y-0.5">
            {NAV_ITEMS.filter(i => i.section === section).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`sidebar-nav-link ${isActive ? "sidebar-nav-link-active" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="sidebar-nav-icon">
                      <item.icon className="h-4 w-4" style={{ color: isActive ? "hsl(28 85% 35%)" : "hsl(28 85% 45%)" }} />
                    </div>
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "hsl(28 85% 45%)", color: "white" }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
