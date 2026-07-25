"use client";

import React, { useMemo, useState } from "react";
import {
  createAccessCredential,
  deleteAccessCredential,
  revealAccessPassword,
  toggleAccessFavorite,
  updateAccessCredential,
  type AccessCredentialDTO,
} from "@/app/actions/acessos";
import {
  ACCESS_CATEGORIES,
  ACCESS_CATEGORY_STYLES,
  accessCategoryLabel,
  faviconUrlFor,
  normalizeAccessUrl,
  type AccessCategory,
} from "@/lib/accessCategories";
import { ActionDialogHost, useActionDialog } from "@/components/ActionDialogHost";
import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/context/PermissionsContext";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Landmark,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  Server,
  Share2,
  Sparkles,
  Star,
  Trash2,
  AppWindow,
} from "lucide-react";

interface AcessosClientProps {
  initialItems: AccessCredentialDTO[];
  companyId: string;
}

type FormState = {
  titulo: string;
  categoria: AccessCategory;
  url: string;
  usuario: string;
  senha: string;
  notas: string;
  favorito: boolean;
  clearPassword: boolean;
};

const EMPTY_FORM: FormState = {
  titulo: "",
  categoria: "SITE",
  url: "",
  usuario: "",
  senha: "",
  notas: "",
  favorito: false,
  clearPassword: false,
};

const CATEGORY_ICONS: Record<AccessCategory, React.ComponentType<{ className?: string }>> = {
  SITE: Globe,
  EMAIL: Mail,
  HOSPEDAGEM: Server,
  REDE_SOCIAL: Share2,
  BANCO: Landmark,
  SOFTWARE: AppWindow,
  OUTRO: KeyRound,
};

function getInitials(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return title.slice(0, 2).toUpperCase() || "AC";
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function AcessosClient({ initialItems, companyId }: AcessosClientProps) {
  const { canWrite } = usePermissions();
  const isReadOnly = !canWrite("acessos");
  const dialog = useActionDialog();
  const { showSuccess, showError, confirmAction } = dialog;

  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | AccessCategory>("ALL");
  const [secretsHidden, setSecretsHidden] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AccessCredentialDTO | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [faviconBroken, setFaviconBroken] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.categoria !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.titulo.toLowerCase().includes(q) ||
        (item.usuario || "").toLowerCase().includes(q) ||
        (item.hostname || "").toLowerCase().includes(q) ||
        (item.notas || "").toLowerCase().includes(q) ||
        accessCategoryLabel(item.categoria).toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: AccessCredentialDTO) => {
    setEditing(item);
    setForm({
      titulo: item.titulo,
      categoria: item.categoria,
      url: item.url || "",
      usuario: item.usuario || "",
      senha: "",
      notas: item.notas || "",
      favorito: item.favorito,
      clearPassword: false,
    });
    setFormOpen(true);
  };

  const handleCopy = async (key: string, value: string) => {
    const ok = await copyText(value);
    if (!ok) {
      showError("Cópia falhou", "Não foi possível copiar para a área de transferência.");
      return;
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1600);
  };

  const ensureRevealed = async (item: AccessCredentialDTO) => {
    if (revealed[item.id]) return revealed[item.id];
    if (!item.hasPassword) return null;
    setRevealingId(item.id);
    const res = await revealAccessPassword(companyId, item.id);
    setRevealingId(null);
    if (!res.success || !res.password) {
      showError("Senha", res.error || "Não foi possível revelar a senha.");
      return null;
    }
    setRevealed((prev) => ({ ...prev, [item.id]: res.password! }));
    return res.password;
  };

  const handleRevealToggle = async (item: AccessCredentialDTO) => {
    if (secretsHidden) {
      showError("Cofre fechado", "Abra o olho no topo da página para revelar senhas.");
      return;
    }
    if (revealed[item.id]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }
    await ensureRevealed(item);
  };

  const handleCopyPassword = async (item: AccessCredentialDTO) => {
    if (secretsHidden) {
      showError("Cofre fechado", "Abra o olho no topo da página para copiar senhas.");
      return;
    }
    const password = await ensureRevealed(item);
    if (!password) return;
    await handleCopy(`pwd-${item.id}`, password);
  };

  const handleToggleFavorite = async (item: AccessCredentialDTO) => {
    if (isReadOnly) return;
    const res = await toggleAccessFavorite(companyId, item.id);
    if (!res.success || !res.item) {
      showError("Favorito", res.error || "Falha ao atualizar.");
      return;
    }
    setItems((prev) =>
      [...prev.map((i) => (i.id === item.id ? res.item! : i))].sort((a, b) => {
        if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
        return a.titulo.localeCompare(b.titulo, "pt-BR");
      })
    );
  };

  const handleDelete = (item: AccessCredentialDTO) => {
    if (isReadOnly) return;
    confirmAction({
      title: "Excluir acesso?",
      message: `Remover permanentemente “${item.titulo}” do cofre?`,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        const res = await deleteAccessCredential(companyId, item.id);
        if (!res.success) {
          showError("Exclusão", res.error || "Falha ao excluir.");
          return;
        }
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setRevealed((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        showSuccess("Removido", "Acesso excluído do cofre.");
      },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    const payload = {
      titulo: form.titulo,
      categoria: form.categoria,
      url: form.url,
      usuario: form.usuario,
      senha: form.senha || null,
      clearPassword: form.clearPassword,
      notas: form.notas,
      favorito: form.favorito,
    };

    const res = editing
      ? await updateAccessCredential(companyId, editing.id, payload)
      : await createAccessCredential(companyId, payload);

    setSaving(false);
    if (!res.success || !res.item) {
      showError("Salvar", res.error || "Não foi possível salvar.");
      return;
    }

    setItems((prev) => {
      const next = editing
        ? prev.map((i) => (i.id === editing.id ? res.item! : i))
        : [res.item!, ...prev];
      return next.sort((a, b) => {
        if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
        return a.titulo.localeCompare(b.titulo, "pt-BR");
      });
    });

    if (editing && (form.senha || form.clearPassword)) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[editing.id];
        return next;
      });
    }

    setFormOpen(false);
    showSuccess(editing ? "Atualizado" : "Salvo", "Acesso guardado no cofre.");
  };

  return (
    <div className="space-y-6">
      <ActionDialogHost dialog={dialog} />

      <PageHeader
        title="Acessos"
        description="Cofre da empresa: logins e senhas de sites, painéis e serviços."
        help={
          <TooltipBody
            title="Cofre de acessos"
            items={[
              "Guarde aqui logins compartilhados da Móveis Unghero (hospedagem, e-mail, redes, bancos).",
              "As senhas ficam criptografadas no banco — só revelam sob demanda.",
              "Use o olho no topo para liberar a revelação/cópia de senhas nesta tela.",
              "Somente a Diretoria acessa este módulo.",
            ]}
          />
        }
        actions={
          !isReadOnly ? (
            <Button type="button" onClick={openCreate} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Novo acesso
            </Button>
          ) : undefined
        }
      >
        <button
          type="button"
          onClick={() => {
            setSecretsHidden((v) => !v);
            if (!secretsHidden) setRevealed({});
          }}
          className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 text-muted-foreground hover:text-foreground border border-border shadow-xs transition-all duration-200 cursor-pointer group"
          title={
            secretsHidden
              ? "Liberar revelação de senhas nesta página"
              : "Ocultar senhas reveladas"
          }
        >
          {secretsHidden ? (
            <EyeOff className="h-4.5 w-4.5 text-primary group-hover:scale-105 transition-transform" />
          ) : (
            <Eye className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
          )}
        </button>
      </PageHeader>

      <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 bg-[linear-gradient(135deg,#1c1917_0%,#292524_48%,#3f3a32_100%)] px-5 py-4 sm:px-6 sm:py-5 text-white shadow-[0_12px_40px_-18px_rgba(28,25,23,0.55)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-400/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-amber-600/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 border border-amber-300/25 text-amber-200">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
                Cofre Unghero
              </p>
              <p className="text-sm sm:text-base font-semibold text-white/95 leading-snug mt-0.5">
                {items.length === 0
                  ? "Nenhum acesso guardado ainda"
                  : `${items.length} acesso${items.length === 1 ? "" : "s"} · ${
                      items.filter((i) => i.favorito).length
                    } favorito${items.filter((i) => i.favorito).length === 1 ? "" : "s"}`}
              </p>
              <p className="text-xs text-white/55 mt-1 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-300/80" />
                Senhas criptografadas · revelação sob demanda
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-white/70">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border",
                secretsHidden
                  ? "bg-white/5 border-white/10"
                  : "bg-amber-400/15 border-amber-300/30 text-amber-100"
              )}
            >
              {secretsHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {secretsHidden ? "Senhas protegidas" : "Revelação liberada"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, usuário, site…"
            className="pl-9 bg-white"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
          <FilterChip
            active={categoryFilter === "ALL"}
            onClick={() => setCategoryFilter("ALL")}
            label="Todos"
          />
          {ACCESS_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat.key}
              active={categoryFilter === cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              label={cat.short}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-800 border border-amber-500/20">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">
            {items.length === 0 ? "Seu cofre está vazio" : "Nenhum resultado"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
            {items.length === 0
              ? "Cadastre o primeiro acesso — HostGator, e-mail, Instagram, banco…"
              : "Tente outra busca ou categoria."}
          </p>
          {!isReadOnly && items.length === 0 && (
            <Button type="button" onClick={openCreate} className="mt-5 gap-2">
              <Plus className="h-4 w-4" />
              Adicionar acesso
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item, index) => {
            const style = ACCESS_CATEGORY_STYLES[item.categoria];
            const Icon = CATEGORY_ICONS[item.categoria];
            const favicon = faviconUrlFor(item.url);
            const showFavicon = Boolean(favicon && !faviconBroken[item.id]);
            const passwordShown = Boolean(revealed[item.id]);
            const href = normalizeAccessUrl(item.url);

            return (
              <article
                key={item.id}
                className={cn(
                  "group/card relative overflow-hidden rounded-2xl border bg-gradient-to-br shadow-[var(--shadow-sm)] transition-all duration-[var(--motion-base)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
                  style.card,
                  style.glow,
                  "animate-[fadeInUp_0.45s_var(--ease-out)_both]"
                )}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className={cn("h-1.5 w-full bg-gradient-to-r", style.ribbon)} />

                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border overflow-hidden shadow-xs",
                        style.icon
                      )}
                    >
                      {showFavicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={favicon!}
                          alt=""
                          className="h-7 w-7 object-contain"
                          onError={() =>
                            setFaviconBroken((prev) => ({ ...prev, [item.id]: true }))
                          }
                        />
                      ) : (
                        <span className="text-sm font-black tracking-tight">
                          {getInitials(item.titulo)}
                        </span>
                      )}
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-lg bg-white border border-black/5 shadow-xs text-stone-700">
                        <Icon className="h-3 w-3" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <h3 className="font-extrabold text-slate-900 text-[15px] leading-tight tracking-tight truncate">
                          {item.titulo}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(item)}
                          disabled={isReadOnly}
                          className={cn(
                            "shrink-0 mt-0.5 rounded-md p-0.5 transition-colors",
                            item.favorito
                              ? "text-amber-500"
                              : "text-slate-300 hover:text-amber-500",
                            isReadOnly && "cursor-default"
                          )}
                          title={item.favorito ? "Remover dos favoritos" : "Favoritar"}
                        >
                          <Star
                            className={cn("h-4 w-4", item.favorito && "fill-current")}
                          />
                        </button>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            style.badge
                          )}
                        >
                          {accessCategoryLabel(item.categoria)}
                        </span>
                        {item.hostname && (
                          <span className="text-[11px] font-medium text-slate-500 truncate max-w-[10rem]">
                            {item.hostname}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <SecretRow
                      label="Usuário"
                      value={item.usuario || "—"}
                      canCopy={Boolean(item.usuario)}
                      copied={copiedKey === `user-${item.id}`}
                      onCopy={() => item.usuario && handleCopy(`user-${item.id}`, item.usuario)}
                    />
                    <SecretRow
                      label="Senha"
                      value={
                        !item.hasPassword
                          ? "Sem senha"
                          : passwordShown
                            ? revealed[item.id]
                            : "••••••••••••"
                      }
                      mono
                      canCopy={item.hasPassword}
                      copied={copiedKey === `pwd-${item.id}`}
                      onCopy={() => handleCopyPassword(item)}
                      trailing={
                        item.hasPassword ? (
                          <button
                            type="button"
                            onClick={() => handleRevealToggle(item)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/80 hover:text-slate-800 transition-colors"
                            title={passwordShown ? "Ocultar senha" : "Revelar senha"}
                          >
                            {revealingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : passwordShown ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : null
                      }
                    />
                  </div>

                  {item.notas && (
                    <p className="text-[12px] text-slate-600 leading-relaxed line-clamp-2 border-t border-black/5 pt-3">
                      {item.notas}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 pt-1 border-t border-black/5">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 h-8 text-xs font-bold text-slate-700 hover:bg-white/80 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir
                      </a>
                    ) : null}
                    <div className="flex-1" />
                    {!isReadOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-white/80 hover:text-slate-800 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog
        isOpen={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        className="max-w-lg"
        bodyClassName="p-0"
      >
        <form onSubmit={handleSave} className="flex flex-col">
          <div className="px-5 pt-5 pb-4 border-b border-border bg-[linear-gradient(180deg,#faf8f5_0%,#ffffff_100%)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800/70">
              Cofre de acessos
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
              {editing ? "Editar acesso" : "Novo acesso"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Título, categoria e credenciais. A senha é criptografada ao salvar.
            </p>
          </div>

          <div className="px-5 py-4 space-y-3.5 max-h-[min(70vh,520px)] overflow-y-auto">
            <Field label="Título">
              <Input
                required
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex.: HostGator, Gmail Unghero…"
              />
            </Field>

            <Field label="Categoria">
              <select
                value={form.categoria}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    categoria: e.target.value as AccessCategory,
                  }))
                }
                className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm font-medium"
              >
                {ACCESS_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="URL / site">
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://…"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Usuário / e-mail">
                <Input
                  value={form.usuario}
                  onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                  placeholder="login@…"
                  autoComplete="off"
                />
              </Field>
              <Field
                label={
                  editing?.hasPassword && !form.clearPassword
                    ? "Nova senha (opcional)"
                    : "Senha"
                }
              >
                <Input
                  type="password"
                  value={form.senha}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      senha: e.target.value,
                      clearPassword: false,
                    }))
                  }
                  placeholder={editing?.hasPassword ? "••••••••" : "Senha"}
                  autoComplete="new-password"
                  disabled={form.clearPassword}
                />
              </Field>
            </div>

            {editing?.hasPassword && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.clearPassword}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      clearPassword: e.target.checked,
                      senha: e.target.checked ? "" : f.senha,
                    }))
                  }
                  className="rounded border-border"
                />
                Remover senha salva
              </label>
            )}

            <Field label="Notas">
              <textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                rows={3}
                placeholder="Dicas, 2FA, quem usa…"
                className="flex w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm resize-none"
              />
            </Field>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.favorito}
                onChange={(e) => setForm((f) => ({ ...f, favorito: e.target.checked }))}
                className="rounded border-border"
              />
              Marcar como favorito
            </label>
          </div>

          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 bg-slate-50/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gap-2 min-w-28">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Salvar" : "Criar acesso"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 h-8 text-xs font-bold border transition-colors",
        active
          ? "bg-stone-900 text-white border-stone-900"
          : "bg-white text-slate-600 border-border hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function SecretRow({
  label,
  value,
  mono,
  canCopy,
  copied,
  onCopy,
  trailing,
}: {
  label: string;
  value: string;
  mono?: boolean;
  canCopy?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/70 border border-black/5 px-3 py-2 flex items-center gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p
          className={cn(
            "text-[13px] font-semibold text-slate-800 truncate",
            mono && "font-mono tracking-wide"
          )}
        >
          {value}
        </p>
      </div>
      {trailing}
      {canCopy && onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 transition-colors shrink-0"
          title="Copiar"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
