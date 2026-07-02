"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Menu, 
  X, 
  User as UserIcon,
  LogOut,
  Kanban,
  Calendar,
  DollarSign,
  Layers,
  LayoutDashboard,
  Users,
  Package
} from "lucide-react";

interface SidebarToggleProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    cargo?: string;
  };
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  section: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/crm", icon: LayoutDashboard, section: "Principal" },
  { name: "CRM / Projetos", href: "/crm", icon: Kanban, section: "Principal" },
  { name: "Clientes & Leads", href: "/clientes", icon: Users, section: "Principal" },
  { name: "Agenda", href: "/agenda", icon: Calendar, section: "Operacional" },
  { name: "Chão de Fábrica", href: "/factory", icon: Layers, section: "Operacional" },
  { name: "Estoque & Fornecedores", href: "/estoque", icon: Package, section: "Operacional" },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign, section: "Financeiro" },
];

const SECTIONS = [...new Set(NAV_ITEMS.map(i => i.section))];

export default function SidebarToggle({ user }: SidebarToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer"
        style={{ background: "hsl(210 20% 95%)", color: "hsl(220 20% 35%)" }}
        aria-label="Menu principal"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={toggleMenu}
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 w-72 z-50 md:hidden flex flex-col transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out`}
        style={{ background: "white", borderRight: "1px solid hsl(210 15% 89%)" }}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between h-16 px-5"
          style={{ borderBottom: "1px solid hsl(210 15% 89%)" }}>
          <img 
            src="/logo.png" 
            alt="Móveis Unghero" 
            className="h-9 w-auto object-contain"
            style={{ filter: "sepia(1) saturate(2) hue-rotate(340deg) brightness(0.7)" }}
          />
          <button
            onClick={toggleMenu}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: "hsl(210 10% 50%)" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-5">
          {SECTIONS.map(section => (
            <div key={section}>
              <p className="text-[10px] font-black uppercase tracking-widest px-2 mb-2"
                style={{ color: "hsl(210 10% 60%)" }}>
                {section}
              </p>
              <div className="space-y-0.5">
                {NAV_ITEMS.filter(i => i.section === section).map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={toggleMenu}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200"
                    style={{ color: "hsl(220 20% 35%)" }}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "hsl(210 20% 95%)" }}>
                      <item.icon className="h-4 w-4" style={{ color: "hsl(28 85% 45%)" }} />
                    </div>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Perfil */}
        <div className="p-3 m-3 rounded-xl"
          style={{ background: "hsl(210 20% 97%)", border: "1px solid hsl(210 15% 89%)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
              style={{ background: "hsl(28 85% 95%)", border: "1px solid hsl(28 85% 85%)" }}>
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-9 h-9 rounded-xl object-cover" />
              ) : (
                <UserIcon className="h-4 w-4" style={{ color: "hsl(28 85% 45%)" }} />
              )}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "hsl(220 20% 10%)" }}>
                {user.name}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "hsl(28 85% 45%)" }}>
                {user.cargo || "COMERCIAL"}
              </span>
            </div>
          </div>
          <form action="/api/auth/sign-out" method="POST" className="w-full">
            <button
              type="submit"
              className="flex items-center w-full px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              style={{ color: "hsl(210 10% 50%)" }}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sair do Painel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
