import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SemAcessoPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="text-xl font-black text-slate-800">Você não tem acesso a esta área</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Seu perfil não tem permissão para acessar este módulo. Caso precise de acesso, entre em
          contato com um administrador (Diretoria) para ajustar suas permissões.
        </p>
        <Link
          href="/crm"
          className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
