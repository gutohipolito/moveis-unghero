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
    <div className="flex w-full max-w-full items-center gap-1 overflow-x-auto overscroll-x-contain p-1 bg-slate-100/80 border border-slate-200/60 rounded-[var(--radius-md)] scrollbar-none">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex flex-1 shrink-0 justify-center items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] text-xs font-bold transition-all whitespace-nowrap ${
              active
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
