"use client";

import React, { useState } from "react";
import { payInstallment } from "@/app/actions/operations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search,
  Building,
  User,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";

interface InstallmentItem {
  id: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  tipo: string;
  projectId: string;
  clientName: string;
}

interface FinanceiroClientProps {
  initialInstallments: InstallmentItem[];
}

export default function FinanceiroClient({ initialInstallments }: FinanceiroClientProps) {
  const [installments, setInstallments] = useState<InstallmentItem[]>(initialInstallments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Ação de Quitar Parcela
  const handlePay = async (item: InstallmentItem) => {
    if (!confirm(`Confirmar o recebimento no valor de R$ ${item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}?`)) {
      return;
    }

    // Atualiza estado local
    setInstallments(installments.map(ins => ins.id === item.id ? { 
      ...ins, 
      status: "PAGO", 
      data_pagamento: new Date().toISOString() 
    } : ins));

    await payInstallment(item.projectId, item.id);
  };

  // Cálculos de Indicadores
  const faturamentoTotal = installments.reduce((acc, curr) => acc + curr.valor, 0);
  const totalRecebido = installments
    .filter(ins => ins.status === "PAGO")
    .reduce((acc, curr) => acc + curr.valor, 0);
  const totalPendente = installments
    .filter(ins => ins.status === "PENDENTE")
    .reduce((acc, curr) => acc + curr.valor, 0);
  const totalAtrasado = installments
    .filter(ins => ins.status === "ATRASADO")
    .reduce((acc, curr) => acc + curr.valor, 0);

  // Formatação
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  // Filtragem
  const filteredInstallments = installments.filter(ins => {
    const matchesSearch = ins.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || ins.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Cards de Indicadores Financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 glass-card border-[#2d241f] flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Faturamento Bruto</span>
            <strong className="text-xl text-foreground font-extrabold">{formatCurrency(faturamentoTotal)}</strong>
          </div>
        </Card>

        <Card className="p-5 glass-card border-[#2d241f] flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Recebido</span>
            <strong className="text-xl text-foreground font-extrabold">{formatCurrency(totalRecebido)}</strong>
          </div>
        </Card>

        <Card className="p-5 glass-card border-[#2d241f] flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Saldo a Receber</span>
            <strong className="text-xl text-foreground font-extrabold">{formatCurrency(totalPendente)}</strong>
          </div>
        </Card>

        <Card className="p-5 glass-card border-[#2d241f] flex items-center gap-4">
          <div className="p-3 bg-destructive/10 text-destructive/80 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Inadimplência</span>
            <strong className="text-xl text-foreground font-extrabold">{formatCurrency(totalAtrasado)}</strong>
          </div>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="p-4 glass-card border-[#2d241f] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-black/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Filtrar status:</span>
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/20 text-xs h-9"
          >
            <option value="ALL">Todos os Recebíveis</option>
            <option value="PAGO">Liquidadas / Pagas</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="ATRASADO">Atrasadas</option>
          </Select>
        </div>
      </Card>

      {/* Tabela de Contas a Receber */}
      <Card className="glass-card border-[#2d241f] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2d241f]/50 text-muted-foreground text-xs uppercase font-bold bg-black/15">
                <th className="p-4">Cliente / Contratante</th>
                <th className="p-4 text-center">Tipo</th>
                <th className="p-4 text-right">Valor Parcela</th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4 text-center">Pagamento</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-neutral-300">
              {filteredInstallments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma parcela ou faturamento correspondente encontrado.
                  </td>
                </tr>
              ) : (
                filteredInstallments.map((item) => {
                  const isPaid = item.status === "PAGO";
                  const isLate = item.status === "ATRASADO";
                  
                  return (
                    <tr key={item.id} className="hover:bg-black/10 transition-colors">
                      <td className="p-4 font-bold text-foreground">
                        <div className="flex flex-col">
                          <span>{item.clientName}</span>
                          <Link 
                            href={`/projects/${item.projectId}`} 
                            className="text-[10px] text-primary hover:underline inline-flex items-center mt-0.5"
                          >
                            Ver Projeto <ArrowUpRight className="h-2.5 w-2.5 ml-0.5" />
                          </Link>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.tipo === "ENTRADA" 
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-foreground">
                        {formatCurrency(item.valor)}
                      </td>
                      <td className="p-4 text-center font-medium">
                        {new Date(item.data_vencimento).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-4 text-center text-xs text-muted-foreground font-semibold">
                        {item.data_pagamento 
                          ? new Date(item.data_pagamento).toLocaleDateString("pt-BR") 
                          : "—"
                        }
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                          isPaid 
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                            : isLate 
                              ? "bg-destructive/15 text-destructive/80 border border-destructive/20" 
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isPaid ? "bg-emerald-400" : isLate ? "bg-destructive" : "bg-amber-400"
                          }`} />
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {!isPaid && (
                          <Button 
                            onClick={() => handlePay(item)} 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Quitar Parcela
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
