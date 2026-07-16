"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SupplierSignupForm from "@/app/cadastro-fornecedor/SupplierSignupForm";

export default function NovoFornecedorClient({ companyId }: { companyId: string }) {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/estoque"
            className="inline-flex items-center -ml-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar ao estoque
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Cadastrar Fornecedor
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Preencha a ficha completa do fornecedor — a mesma do formulário público — para
            homologação comercial e logística.
          </p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm bg-slate-950">
        <SupplierSignupForm
          companyId={companyId}
          viaPainel
          onCreated={(id) => router.push(`/estoque/fornecedores/${id}`)}
        />
      </div>
    </div>
  );
}
