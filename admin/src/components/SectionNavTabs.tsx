"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, type LucideIcon } from "lucide-react";

export type SectionNavTab = {
  href: string;
  label: string;
  icon?: LucideIcon;
  iconClass?: string;
  isActive?: (pathname: string) => boolean;
};

type SectionNavTabsProps = {
  tabs: SectionNavTab[];
  ariaLabel: string;
};

export default function SectionNavTabs({ tabs, ariaLabel }: SectionNavTabsProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const tabIsActive = (tab: SectionNavTab) =>
    tab.isActive ? tab.isActive(pathname) : pathname === tab.href;
  const currentHref = tabs.find(tabIsActive)?.href ?? tabs[0]?.href ?? "";

  if (tabs.length <= 1) return null;

  return (
    <>
      <div className="relative sm:hidden mb-3">
        <select
          aria-label={ariaLabel}
          value={currentHref}
          onChange={(e) => router.push(e.target.value)}
          className="w-full appearance-none bg-white border border-border rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        >
          {tabs.map((tab) => (
            <option key={tab.href} value={tab.href}>
              {tab.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      <div className="hidden sm:block">
        <div className="section-tabs" aria-label={ariaLabel}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tabIsActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`section-tabs-item ${active ? "section-tabs-item-active" : ""}`}
              >
                {Icon ? (
                  <Icon
                    className={`h-4 w-4 shrink-0 ${tab.iconClass ?? (active ? "text-primary" : "text-slate-500")}`}
                  />
                ) : null}
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
