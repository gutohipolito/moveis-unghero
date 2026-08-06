"use client";

import React, { useMemo, useState } from "react";
import {
  Mail,
  MapPin,
  Phone,
  Search,
} from "lucide-react";
import { PartyPopperIcon, UsersIcon, HighlightAnimatedIcon } from "@/components/icons";
import type { PartnerPortalClient, PartnerPortalData } from "@/lib/partnerPortal";
import { formatPartnerClientAddress } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NEW_CLIENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface ParceiroClientesClientProps {
  partner: PartnerPortalData;
  clients: PartnerPortalClient[];
  isAdminPreview?: boolean;
}

type TabId = "all" | "new";

function isNewClient(client: PartnerPortalClient, now: number) {
  const attributed = client.partnerAttributedAt
    ? new Date(client.partnerAttributedAt).getTime()
    : null;
  if (attributed != null && now - attributed <= NEW_CLIENT_WINDOW_MS) return true;
  // Fallback: cadastro recente sem attributed (legado) não conta como "novo" de indicação
  return false;
}

export default function ParceiroClientesClient({
  partner,
  clients,
  isAdminPreview = false,
}: ParceiroClientesClientProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabId>("all");
  const now = Date.now();

  const newClients = useMemo(
    () => clients.filter((c) => isNewClient(c, now)),
    [clients, now]
  );

  const filtered = useMemo(() => {
    const base = tab === "new" ? newClients : clients;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => {
      const address = formatPartnerClientAddress(c).toLowerCase();
      return (
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.telefone.toLowerCase().includes(q) ||
        address.includes(q) ||
        c.cidade.toLowerCase().includes(q)
      );
    });
  }, [clients, newClients, search, tab]);

  return (
    <ParceiroPortalShell partner={partner} isAdminPreview={isAdminPreview}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="parceiro-page-kicker">Carteira</p>
            <h1 className="parceiro-page-title">
              {clients.length} cliente{clients.length === 1 ? "" : "s"}
            </h1>
            <p className="parceiro-page-desc">
              Indicados por você ou com projetos vinculados.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "parceiro-filter-chip",
              tab === "all" && "is-active"
            )}
          >
            Todos · {clients.length}
          </button>
          <button
            type="button"
            onClick={() => setTab("new")}
            className={cn(
              "parceiro-filter-chip",
              tab === "new" && "is-active"
            )}
          >
            Novos · {newClients.length}
          </button>
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
              {tab === "new" ? (
                <HighlightAnimatedIcon icon={PartyPopperIcon} size={24} playOnMount />
              ) : (
                <HighlightAnimatedIcon icon={UsersIcon} size={24} playOnMount />
              )}
            </div>
            <h2 className="font-display font-bold text-slate-900">
              {tab === "new" ? "Nenhum cadastro novo" : "Nenhum cliente vinculado"}
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              {tab === "new"
                ? "Aqui entram clientes que se cadastraram pelo seu link nos últimos 7 dias."
                : clients.length === 0
                  ? "Compartilhe seu link em Marketing ou aguarde a Móveis Unghero vincular um projeto ao seu nome."
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
              const isNew = isNewClient(client, now);

              return (
                <li key={client.id} className="partner-card">
                  <div className="partner-card-accent" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-display font-bold text-slate-900 truncate">
                            {client.nome}
                          </h2>
                          {isNew && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Novo
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                          {client.projectsCount}{" "}
                          {client.projectsCount === 1 ? "projeto" : "projetos"}
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
