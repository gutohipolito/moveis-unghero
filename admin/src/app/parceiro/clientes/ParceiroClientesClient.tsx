"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Mail, MapPin, Phone, Search } from "lucide-react";
import type { PartnerPortalClient, PartnerPortalData } from "@/lib/partnerPortal";
import { formatPartnerClientAddress } from "@/lib/partnerPortal";
import ParceiroPortalShell from "@/app/parceiro/ParceiroPortalShell";
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
  return false;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function whatsappHref(telefone: string) {
  const phoneDigits = telefone.replace(/\D/g, "");
  const waNumber =
    phoneDigits.length >= 12 && phoneDigits.startsWith("55")
      ? phoneDigits
      : phoneDigits.length >= 10
        ? `55${phoneDigits.slice(-11)}`
        : null;
  return waNumber ? `https://wa.me/${waNumber}` : null;
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
      <div className="parceiro-veio-clients">
        <header className="parceiro-veio-clients-header">
          <h1 className="parceiro-veio-title">Clientes</h1>
          <p className="parceiro-veio-subtitle">
            Indicados por você ou com projetos vinculados à Móveis Unghero.
          </p>
        </header>

        <div className="parceiro-veio-clients-toolbar">
          <div
            className="parceiro-veio-finance-filters"
            role="toolbar"
            aria-label="Filtrar clientes"
          >
            <button
              type="button"
              onClick={() => setTab("all")}
              aria-pressed={tab === "all"}
              className={cn(
                "parceiro-veio-finance-filter",
                tab === "all" && "is-active"
              )}
            >
              <span>Todos</span>
              <span className="parceiro-veio-finance-filter-count">{clients.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("new")}
              aria-pressed={tab === "new"}
              className={cn(
                "parceiro-veio-finance-filter",
                tab === "new" && "is-active"
              )}
            >
              <span>Novos</span>
              <span className="parceiro-veio-finance-filter-count">
                {newClients.length}
              </span>
            </button>
          </div>

          <label className="parceiro-veio-clients-search">
            <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, cidade, telefone…"
              aria-label="Buscar clientes"
            />
          </label>
        </div>

        {filtered.length === 0 ? (
          <section className="parceiro-veio-empty">
            <div className="parceiro-veio-empty-mark" aria-hidden />
            <h2 className="parceiro-veio-empty-title">
              {tab === "new" ? "Nenhum cadastro novo" : "Nenhum cliente vinculado"}
            </h2>
            <p className="parceiro-veio-empty-desc">
              {tab === "new"
                ? "Aqui entram clientes que se cadastraram pelo seu link nos últimos 7 dias."
                : clients.length === 0
                  ? "Compartilhe seu link em Indicar cliente ou aguarde a Móveis Unghero vincular um projeto."
                  : "Tente outro termo de busca."}
            </p>
            {clients.length === 0 ? (
              <Link href="/parceiro/marketing" className="parceiro-veio-cta">
                Indicar cliente
              </Link>
            ) : null}
          </section>
        ) : (
          <ul className="parceiro-veio-clients-list">
            {filtered.map((client) => {
              const address = formatPartnerClientAddress(client);
              const waHref = whatsappHref(client.telefone);
              const isNew = isNewClient(client, now);
              const projectsLabel =
                client.projectsCount === 0
                  ? "Sem projetos"
                  : `${client.projectsCount} projeto${client.projectsCount === 1 ? "" : "s"}`;

              return (
                <li key={client.id}>
                  <article className="parceiro-veio-client-row">
                    <span className="parceiro-veio-thumb" aria-hidden>
                      {initials(client.nome)}
                    </span>

                    <div className="parceiro-veio-client-main min-w-0">
                      <div className="parceiro-veio-client-top">
                        <h2 className="parceiro-veio-client-name">{client.nome}</h2>
                        {isNew ? (
                          <span className="parceiro-veio-client-badge">Novo</span>
                        ) : null}
                      </div>
                      <p className="parceiro-veio-client-meta">
                        <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <span className="truncate">{address}</span>
                      </p>
                      <p className="parceiro-veio-client-projects">{projectsLabel}</p>
                    </div>

                    <div className="parceiro-veio-client-actions">
                      {waHref ? (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noreferrer"
                          className="parceiro-veio-finance-btn is-ghost"
                        >
                          <Phone className="h-3.5 w-3.5" aria-hidden />
                          WhatsApp
                        </a>
                      ) : client.telefone ? (
                        <span className="parceiro-veio-client-contact">
                          <Phone className="h-3.5 w-3.5" aria-hidden />
                          {client.telefone}
                        </span>
                      ) : null}
                      {client.email ? (
                        <a
                          href={`mailto:${client.email}`}
                          className="parceiro-veio-finance-btn is-ghost"
                        >
                          <Mail className="h-3.5 w-3.5" aria-hidden />
                          E-mail
                        </a>
                      ) : null}
                      {client.projectsCount > 0 ? (
                        <Link
                          href="/parceiro/projetos"
                          className="parceiro-veio-finance-btn is-solid"
                        >
                          Projetos
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ParceiroPortalShell>
  );
}
