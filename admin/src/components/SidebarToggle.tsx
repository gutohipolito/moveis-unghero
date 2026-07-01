"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Menu, 
  X, 
  User as UserIcon,
  LogOut,
  Kanban,
  FolderOpen,
  Calendar,
  DollarSign,
  Layers
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
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "CRM Kanban", href: "/crm", icon: Kanban },
  { name: "Clientes & Projetos", href: "/crm", icon: FolderOpen },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Chão de Fábrica", href: "/factory", icon: Layers },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign },
];

export default function SidebarToggle({ user }: SidebarToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="flex items-center justify-center p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
        aria-label="Menu principal"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={toggleMenu}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-all duration-300 md:hidden"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 w-64 bg-card/95 border-r border-border backdrop-blur-md z-50 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:hidden flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-border/40">
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-wider text-gradient-gold">
              UNGHERO
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest -mt-1">
              SaaS Admin
            </span>
          </div>
          <button
            onClick={toggleMenu}
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={toggleMenu}
              className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all group"
            >
              <div className="flex items-center">
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </div>
              {item.badge && (
                <span className="text-[9px] font-semibold bg-accent px-1.5 py-0.5 rounded text-muted-foreground">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Perfil */}
        <div className="flex flex-col p-4 border-t border-border/40 bg-black/10">
          <div className="flex items-center px-2 py-1.5 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 border border-primary/30">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full" />
              ) : (
                <UserIcon className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold truncate leading-none text-foreground">
                {user.name}
              </p>
              <span className="text-[10px] font-medium text-primary uppercase tracking-widest mt-1 inline-block">
                {user.cargo || "COMERCIAL"}
              </span>
            </div>
          </div>
          <form action="/api/auth/sign-out" method="POST" className="w-full">
            <button
              type="submit"
              className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair do Painel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
