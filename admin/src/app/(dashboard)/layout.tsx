import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { 
  Kanban, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings, 
  User as UserIcon,
  LogOut,
  FolderOpen
} from "lucide-react";
import { logoutSimulated } from "@/app/actions/login";
import SidebarToggle from "@/components/SidebarToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  }).catch(() => null); // captura erro se o banco estiver indisponível

  // Cria uma sessão mockada para o layout se não houver conexão com o banco
  const user = session?.user || {
    name: "Administrador Unghero",
    email: "admin@unghero.com.br",
    cargo: "ADMIN",
    image: null
  };

  const navItems = [
    { name: "CRM Kanban", href: "/crm", icon: Kanban },
    { name: "Clientes & Projetos", href: "/crm", icon: FolderOpen }, // Na Fase 1 o crm serve como central
    { name: "Agenda", href: "#", icon: Calendar, badge: "Em Breve" },
    { name: "Financeiro", href: "#", icon: DollarSign, badge: "Em Breve" },
  ];

  return (
    <div className="flex min-h-screen bg-transparent">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border/40 bg-card/60 backdrop-blur-md z-30">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Cabeçalho do Sidebar */}
          <div className="flex items-center h-16 px-6 border-b border-border/40">
            <Link href="/crm" className="flex flex-col">
              <span className="text-lg font-bold tracking-wider text-gradient-gold">
                MÓVEIS UNGHERO
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest -mt-1">
                SaaS Admin
              </span>
            </Link>
          </div>

          {/* Links de Navegação */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all group"
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  {item.name}
                </div>
                {item.badge && (
                  <span className="text-[9px] font-semibold bg-accent px-1.5 py-0.5 rounded text-muted-foreground group-hover:text-primary">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Rodapé do Sidebar (Perfil do Usuário) */}
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
            {/* Server Action de Logout */}
            <form action={logoutSimulated} className="w-full">
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
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex flex-col flex-1 md:pl-64">
        {/* Topbar Mobile */}
        <header className="flex items-center justify-between h-16 px-6 border-b border-border/40 bg-card/40 backdrop-blur-md md:hidden">
          <Link href="/crm" className="flex flex-col">
            <span className="text-base font-bold tracking-wider text-gradient-gold">
              UNGHERO
            </span>
          </Link>
          <SidebarToggle user={user} navItems={navItems} />
        </header>

        {/* Corpo da Página */}
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
