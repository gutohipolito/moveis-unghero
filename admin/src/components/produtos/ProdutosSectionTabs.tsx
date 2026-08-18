"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, BookOpen } from "lucide-react";

const TABS = [
  { href: "/produtos", label: "Vitrine", icon: Images },
  { href: "/produtos/catalogos", label: "Catálogos", icon: BookOpen },
];

export default function ProdutosSectionTabs() {
  const pathname = usePathname();

  return (
    <div className="section-tabs">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={`section-tabs-item ${active ? "section-tabs-item-active" : ""}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-slate-500"}`} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
