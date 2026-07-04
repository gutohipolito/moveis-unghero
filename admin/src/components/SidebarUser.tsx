import { User as UserIcon, LogOut } from "lucide-react";
import { logout } from "@/app/actions/login";

interface SidebarUserProps {
  user: {
    name: string;
    email?: string;
    image?: string | null;
    cargo?: string;
  };
}

export default function SidebarUser({ user }: SidebarUserProps) {
  return (
    <div className="sidebar-user">
      <div className="flex items-center gap-3 mb-3">
        <div className="sidebar-user-avatar">
          {user.image ? (
            <img src={user.image} alt={user.name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <UserIcon className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="overflow-hidden flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">{user.name}</p>
          <span className="sidebar-user-role">{user.cargo || "COMERCIAL"}</span>
        </div>
      </div>
      <form action={logout} className="w-full">
        <button type="submit" className="sidebar-logout-btn">
          <LogOut className="mr-2 h-4 w-4" />
          Sair do Painel
        </button>
      </form>
    </div>
  );
}
