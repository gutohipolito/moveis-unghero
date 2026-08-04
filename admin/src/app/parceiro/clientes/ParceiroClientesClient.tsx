"use client";

import React, { useMemo, useState } from "react";
import {
  Mail,
  MapPin,
  Phone,
  Search,
  Users,
} from "lucide-react";
import type { PartnerPortalClient, PartnerPortalData } from "@/lib/partnerPortal";
import { formatPartnerClientAddress } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { Input } from "@/components/ui/input";

interface ParceiroClientesClientProps {
  partner: PartnerPortalData;
  clients: PartnerPortalClient[];
  isAdminPreview?: boolean;
}

export default function ParceiroClientesClient({
  partner,
  clients,
  isAdminPreview = false,
}: ParceiroClientesClientProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const address = formatPartnerClientAddress(c).toLowerCase();
      return (
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.telefone.toLowerCase().includes(q) ||
        address.includes(q) ||
        c.cidade.toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
              Clientes
            </h1>
            <p className="text-xs text-white/60 mt-1 max-w-lg">
              Clientes com obras vinculadas a você na Móveis Unghero. Documentos pessoais não são
              exibidos.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/70 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full self-start sm:self-auto">
            {filtered.length} cliente{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cidade, telefone..."
            className="pl-9 h-11 bg-white/95 border-white/20"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="partner-card p-10 text-center">
            <div className="partner-card-accent" />
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="font-display font-bold text-slate-900">Nenhum cliente vinculado</h2>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              {clients.length === 0
                ? "Quando a Móveis Unghero vincular um projeto ao seu nome, o cliente aparece aqui."
                : "Tente outro termo de busca."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((client) => {
              const address = formatPartnerClientAddress(client);
              const phoneDigits = client.telefone.replace(/\D/g, "");
              const waNumber =
                phoneDigits.length >= 12 && phoneDigits.startsWith("55")
                  ? phoneDigits
                  : phoneDigits.length >= 10
                    ? `55${phoneDigits.slice(-11)}`
                    : null;
              const waHref = waNumber ? `https://wa.me/${waNumber}` : null;

              return (
                <li key={client.id} className="partner-card">
                  <div className="partner-card-accent" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display font-bold text-slate-900 truncate">
                          {client.nome}
                        </h2>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                          {client.projectsCount} obra
                          {client.projectsCount === 1 ? "" : "s"} vinculada
                          {client.projectsCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                      <p className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{address}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {waHref ? (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-emerald-700 hover:underline"
                          >
                            {client.telefone || "Telefone não informado"}
                          </a>
                        ) : (
                          <span>{client.telefone || "Telefone não informado"}</span>
                        )}
                      </p>
                      <p className="flex items-center gap-2 min-w-0">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {client.email ? (
                          <a
                            href={`mailto:${client.email}`}
                            className="font-semibold text-slate-800 hover:underline truncate"
                          >
                            {client.email}
                          </a>
                        ) : (
                          <span>E-mail não informado</span>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
