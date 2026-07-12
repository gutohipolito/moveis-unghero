"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, Users, ClipboardList, Layers, LayoutDashboard } from "lucide-react";
import { isNavItemActive } from "@/components/SidebarNav";
import { usePermissions } from "@/context/PermissionsContext";
import { moduleKeyForHref } from "@/lib/permissions";

const MOBILE_NAV = [
  { name: "Funil", href: "/crm", icon: Kanban },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Orçamentos", href: "/quotes", icon: ClipboardList },
  { name: "Fábrica", href: "/factory", icon: Layers },
  { name: "Relatórios", href: "/bi", icon: LayoutDashboard },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { can } = usePermissions();
  const items = MOBILE_NAV.filter((item) => can(moduleKeyForHref(item.href)));

  if (items.length === 0) return null;

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Navegação principal">
      <div className="mobile-bottom-nav-inner">
        {items.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`mobile-bottom-nav-item ${isActive ? "mobile-bottom-nav-item-active" : ""}`}
            >
              <item.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
