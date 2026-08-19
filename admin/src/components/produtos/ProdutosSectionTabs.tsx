"use client";

import { Images, BookOpen } from "lucide-react";
import SectionNavTabs from "@/components/SectionNavTabs";

const TABS = [
  { href: "/produtos", label: "Vitrine", icon: Images },
  { href: "/produtos/catalogos", label: "Catálogos", icon: BookOpen },
];

export default function ProdutosSectionTabs() {
  return (
    <SectionNavTabs
      ariaLabel="Seções de produtos"
      tabs={TABS}
    />
  );
}
