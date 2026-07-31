"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, Wifi } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import {
  deleteEmailMailbox,
  testEmailMailboxConnection,
  upsertEmailMailbox,
  type EmailMailboxDTO,
  type EmailMailboxInput,
} from "@/app/actions/emailMailboxes";
import {
  DEFAULT_IMAP_HOST,
  DEFAULT_IMAP_PORT,
  DEFAULT_ROLES_BY_AREA,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  EMAIL_AREA_LABELS,
  EMAIL_MAILBOX_AREAS,
} from "@/lib/emailAreas";
import type { EmailMailboxArea, Role } from "@prisma/client";
import { EDITABLE_ROLES, ROLE_LABELS } from "@/lib/permissions";

interface Props {
  initialMailboxes: EmailMailboxDTO[];
}

const emptyForm = (): EmailMailboxInput & { id?: string } => ({
  area: "COMERCIAL",
  address: "",
  displayName: "",
  imapHost: DEFAULT_IMAP_HOST,
  imapPort: DEFAULT_IMAP_PORT,
  smtpHost: DEFAULT_SMTP_HOST,
  smtpPort: DEFAULT_SMTP_PORT,
  password: "",
  signatureText: "",
  ativo: true,
  roles: [...DEFAULT_ROLES_BY_AREA.COMERCIAL],
});

export default function EmailMailboxesConfigClient({ initialMailboxes }: Props) {
  const [mailboxes, setMailboxes] = useState(initialMailboxes);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null
  );

  const openCreate = () => {
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  };

  const openEdit = (box: EmailMailboxDTO) => {
    setForm({
      id: box.id,
      area: box.area,
      address: box.address,
      displayName: box.displayName,
      imapHost: box.imapHost,
      imapPort: box.imapPort,
      smtpHost: box.smtpHost,
      smtpPort: box.smtpPort,
      password: "",
      signatureText: box.signatureText || "",
      ativo: box.ativo,
      roles: box.roles.length ? box.roles : [...DEFAULT_ROLES_BY_AREA[box.area]],
    });
    setError(null);
    setOpen(true);
  };

  const toggleRole = (role: Role) => {
    const current = form.roles || [];
    setForm({
      ...form,
      roles: current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role],
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await upsertEmailMailbox(
      {
        area: form.area,
        address: form.address,
        displayName: form.displayName,
        imapHost: form.imapHost,
        imapPort: form.imapPort,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        password: form.password,
        signatureText: form.signatureText,
        ativo: form.ativo,
        roles: form.roles,
      },
      form.id
    );
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Erro ao salvar.");
      return;
    }
    setOpen(false);
    window.location.reload();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir esta caixa de e-mail?")) return;
    const res = await deleteEmailMailbox(id);
    if (res.success) {
      setMailboxes((prev) => prev.filter((m) => m.id !== id));
    } else {
      setInfo({ tone: "error", text: res.error || "Não foi possível excluir." });
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setInfo(null);
    try {
      const res = await testEmailMailboxConnection(id);
      setInfo(
        res.success
          ? { tone: "ok", text: "Conexão IMAP e SMTP OK com o HostGator." }
          : {
              tone: "error",
              text: res.error || "Falha no teste de conexão.",
            }
      );
    } catch (error) {
      setInfo({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Falha inesperada no teste (timeout ou rede).",
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configurar caixas de e-mail"
        description="IMAP/SMTP HostGator por área (comercial, financeiro, atendimento)."
        actions={
          <div className="flex gap-2">
            <Link href="/emails">
              <Button variant="outline" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
            </Link>
            <Button onClick={openCreate} className="btn-metallic gap-1.5">
              <Plus className="h-4 w-4" /> Nova caixa
            </Button>
          </div>
        }
      />

      {info && (
        <div
          className={`text-sm rounded-lg border px-3 py-2.5 leading-relaxed ${
            info.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
          role="status"
        >
          {info.text}
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-white overflow-hidden">
        {mailboxes.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma caixa cadastrada.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {mailboxes.map((box) => (
              <li
                key={box.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {box.areaLabel}
                    </span>
                    {!box.ativo && (
                      <span className="text-[10px] font-bold uppercase text-rose-600">
                        Inativa
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground mt-1">{box.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{box.address}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    IMAP {box.imapHost}:{box.imapPort} · SMTP {box.smtpHost}:{box.smtpPort}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Cargos:{" "}
                    {box.roles.map((r) => ROLE_LABELS[r] || r).join(", ") || "só Diretoria"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    onClick={() => void handleTest(box.id)}
                    disabled={testingId === box.id}
                  >
                    {testingId === box.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wifi className="h-3.5 w-3.5" />
                    )}
                    Testar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => openEdit(box)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-rose-600"
                    onClick={() => void handleDelete(box.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog isOpen={open} onClose={() => !saving && setOpen(false)} className="max-w-lg">
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-bold">
            {form.id ? "Editar caixa" : "Nova caixa"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Área</label>
              <Select
                value={form.area}
                onChange={(e) => {
                  const area = e.target.value as EmailMailboxArea;
                  setForm({
                    ...form,
                    area,
                    roles: [...DEFAULT_ROLES_BY_AREA[area]],
                  });
                }}
                className="h-9"
              >
                {EMAIL_MAILBOX_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {EMAIL_AREA_LABELS[a]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nome de exibição</label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="h-9"
                placeholder="Comercial Unghero"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">E-mail</label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="h-9"
                placeholder="comercial@moveisunghero.com.br"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">
                Senha {form.id ? "(deixe em branco para manter)" : ""}
              </label>
              <Input
                type="password"
                value={form.password || ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="h-9"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">IMAP host</label>
              <Input
                value={form.imapHost || ""}
                onChange={(e) => setForm({ ...form, imapHost: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">IMAP porta</label>
              <Input
                type="number"
                value={form.imapPort || 993}
                onChange={(e) =>
                  setForm({ ...form, imapPort: Number(e.target.value) || 993 })
                }
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">SMTP host</label>
              <Input
                value={form.smtpHost || ""}
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">SMTP porta</label>
              <Input
                type="number"
                value={form.smtpPort || 465}
                onChange={(e) =>
                  setForm({ ...form, smtpPort: Number(e.target.value) || 465 })
                }
                className="h-9"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Assinatura (opcional)</label>
              <textarea
                value={form.signatureText || ""}
                onChange={(e) => setForm({ ...form, signatureText: e.target.value })}
                className="mt-1 w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={"Atendimento Móveis Unghero\n(54) 9 9997-1050\nmoveisunghero.com.br"}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Incluída automaticamente no final dos e-mails enviados por esta caixa.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Cargos com acesso</p>
            <div className="flex flex-wrap gap-2">
              {EDITABLE_ROLES.map((role) => (
                <label
                  key={role}
                  className="inline-flex items-center gap-1.5 text-xs border border-border/60 rounded-full px-2.5 py-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(form.roles || []).includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ativo !== false}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Caixa ativa
          </label>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
