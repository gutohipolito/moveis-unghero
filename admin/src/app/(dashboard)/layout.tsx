export const runtime = "edge";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, getSessionSafe } from "@/lib/auth";
import { 
  Kanban, 
  Calendar, 
  DollarSign, 
  User as UserIcon,
  LogOut,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Users,
  Package
} from "lucide-react";
import { logoutSimulated } from "@/app/actions/login";
import SidebarToggle from "@/components/SidebarToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionSafe(await headers()).catch(() => null);

  const user = session?.user || {
    name: "Administrador Unghero",
    email: "admin@unghero.com.br",
    cargo: "ADMIN",
    image: null
  };

  interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<any>;
    badge?: string;
    section?: string;
  }

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/crm", icon: LayoutDashboard, section: "Principal" },
    { name: "CRM / Projetos", href: "/crm", icon: Kanban, section: "Principal" },
    { name: "Clientes & Leads", href: "/clientes", icon: Users, section: "Principal" },
    { name: "Agenda", href: "/agenda", icon: Calendar, section: "Operacional" },
    { name: "Chão de Fábrica", href: "/factory", icon: Layers, section: "Operacional" },
    { name: "Estoque & Fornecedores", href: "/estoque", icon: Package, section: "Operacional" },
    { name: "Financeiro", href: "/financeiro", icon: DollarSign, section: "Financeiro" },
  ];

  const sections = [...new Set(navItems.map(i => i.section))];

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(210 20% 98%)" }}>

      {/* ─── Sidebar Desktop ─── */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30"
        style={{ borderRight: "1px solid hsl(210 15% 89%)", background: "#ffffff" }}>

        <div className="flex flex-col flex-1 min-h-0">

          {/* Logo — apenas a imagem, sem container extra */}
          <div className="flex items-center h-16 px-5" style={{ borderBottom: "1px solid hsl(210 15% 89%)" }}>
            <Link href="/crm">
              <img 
                src="/logo.png" 
                alt="Móveis Unghero" 
                className="h-10 w-auto object-contain"
                style={{ filter: "sepia(1) saturate(2) hue-rotate(340deg) brightness(0.7)" }}
              />
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-5">
            {sections.map(section => (
              <div key={section}>
                <p className="text-[10px] font-black uppercase tracking-widest px-2 mb-2"
                  style={{ color: "hsl(210 10% 60%)" }}>
                  {section}
                </p>
                <div className="space-y-0.5">
                  {navItems.filter(i => i.section === section).map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="sidebar-nav-link"
                    >
                      <div className="flex items-center gap-3">
                        <div className="sidebar-nav-icon">
                          <item.icon className="h-4 w-4" style={{ color: "hsl(28 85% 45%)" }} />
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
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Rodapé / Perfil */}
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
                  {(user as any).cargo || "COMERCIAL"}
                </span>
              </div>
            </div>
            <form action={logoutSimulated} className="w-full">
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
      </aside>

      {/* ─── Conteúdo Principal ─── */}
      <div className="flex flex-col flex-1 md:pl-64">

        {/* Topbar Mobile — logo simples */}
        <header className="flex items-center justify-between h-14 px-4 md:hidden"
          style={{ borderBottom: "1px solid hsl(210 15% 89%)", background: "white" }}>
          <Link href="/crm">
            <img 
              src="/logo.png" 
              alt="Móveis Unghero" 
              className="h-8 w-auto object-contain"
              style={{ filter: "sepia(1) saturate(2) hue-rotate(340deg) brightness(0.7)" }}
            />
          </Link>
          <SidebarToggle user={user} />
        </header>

        {/* Corpo da Página */}
        <main className="flex-1 p-5 md:p-7">
          <div className="w-full max-w-full space-y-6 animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
