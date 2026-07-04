"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, Users, ClipboardList, Layers, LayoutDashboard } from "lucide-react";
import { isNavItemActive } from "@/components/SidebarNav";

const MOBILE_NAV = [
  { name: "CRM", href: "/crm", icon: Kanban },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Orçamentos", href: "/quotes", icon: ClipboardList },
  { name: "Fábrica", href: "/factory", icon: Layers },
  { name: "BI", href: "/bi", icon: LayoutDashboard },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Navegação principal">
      {MOBILE_NAV.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav-item ${isActive ? "mobile-bottom-nav-item-active" : ""}`}
          >
            <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
