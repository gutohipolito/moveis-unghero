"use client";

import { useMemo, useState } from "react";
import { Loader2, RotateCcw, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FilterPills from "@/components/FilterPills";
import { usePermissions } from "@/context/PermissionsContext";
import {
  composeBrandedEmail,
  renderEmailPlaceholders,
} from "@/lib/emailBrandedCard";
import {
  OTHER_AUTOMATED_EMAILS,
  sampleTransitionVars,
  type TransitionTemplateKey,
} from "@/lib/emailTransitionTemplates";
import {
  resetEmailTransitionTemplate,
  sendTestTransitionEmail,
  upsertEmailTransitionTemplate,
  type EmailTransitionTemplateDTO,
} from "@/app/actions/emailTransitionTemplates";

type GroupFilter = "todos" | "cliente" | "arquiteto";

interface Props {
  initialTemplates: EmailTransitionTemplateDTO[];
}

export default function EmailTransitionTemplatesPanel({
  initialTemplates,
}: Props) {
  const { isReadOnly } = usePermissions();
  const [templates, setTemplates] = useState(initialTemplates);
  const [group, setGroup] = useState<GroupFilter>("todos");
  const [activeKey, setActiveKey] = useState<TransitionTemplateKey>(
    initialTemplates[0]?.key ?? "CLIENT:APROVADO"
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [info, setInfo] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null
  );

  const visible = useMemo(() => {
    if (group === "todos") return templates;
    return templates.filter((t) => t.group === group);
  }, [templates, group]);

  const current = useMemo(
    () => templates.find((t) => t.key === activeKey) ?? templates[0],
    [templates, activeKey]
  );

  const preview = useMemo(() => {
    if (!current) return null;
    const vars = sampleTransitionVars(current.key);
    return composeBrandedEmail({
      subject: renderEmailPlaceholders(current.subject, vars),
      bodyText: renderEmailPlaceholders(current.body, vars),
      ctaLabel: current.ctaLabel,
      ctaHref: vars.link,
    });
  }, [current]);

  if (!current) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum template cadastrado.</p>
    );
  }

  const updateField = (
    field: "subject" | "body" | "enabled",
    value: string | boolean
  ) => {
    setTemplates((prev) =>
      prev.map((t) => (t.key === current.key ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setInfo(null);
    const res = await upsertEmailTransitionTemplate({
      key: current.key,
      subject: current.subject,
      body: current.body,
      enabled: current.enabled,
    });
    setSaving(false);
    if (!res.success) {
      setInfo({ tone: "error", text: res.error || "Falha ao salvar." });
      return;
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.key === current.key ? { ...t, persisted: true } : t
      )
    );
    setInfo({ tone: "ok", text: "Template salvo. Os próximos envios já usam este texto." });
  };

  const handleReset = async () => {
    setSaving(true);
    setInfo(null);
    const res = await resetEmailTransitionTemplate(current.key);
    setSaving(false);
    if (!res.success) {
      setInfo({ tone: "error", text: res.error || "Falha ao restaurar." });
      return;
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.key === current.key
          ? {
              ...t,
              subject: res.subject,
              body: res.body,
              enabled: res.enabled,
              persisted: true,
            }
          : t
      )
    );
    setInfo({ tone: "ok", text: "Padrão da Móveis Unghero restaurado." });
  };

  const handleTest = async () => {
    setTesting(true);
    setInfo(null);
    const res = await sendTestTransitionEmail({
      key: current.key,
      to: testTo,
      subject: current.subject,
      body: current.body,
    });
    setTesting(false);
    if (!res.success) {
      setInfo({ tone: "error", text: res.error || "Falha no envio de teste." });
      return;
    }
    setInfo({
      tone: "ok",
      text: `Teste enviado para ${res.to} (de ${res.from}). Assunto com prefixo [TESTE].`,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Estes e-mails saem sozinhos quando a etapa do projeto muda (a partir de
        Aprovado) ou quando uma comissão é paga. Lead, Orçamento e Negociação não
        disparam aviso. A prévia ao lado atualiza enquanto você edita.
      </p>

      <FilterPills
        variant="segmented"
        ariaLabel="Filtrar templates por destinatário"
        value={group}
        onChange={(value) => {
          setGroup(value);
          const next = templates.filter((t) =>
            value === "todos" ? true : t.group === value
          );
          if (next[0] && !next.some((t) => t.key === activeKey)) {
            setActiveKey(next[0].key);
            setInfo(null);
          }
        }}
        options={[
          { value: "todos", label: `Todos (${templates.length})` },
          {
            value: "cliente",
            label: `Cliente (${templates.filter((t) => t.group === "cliente").length})`,
          },
          {
            value: "arquiteto",
            label: `Arquiteto (${templates.filter((t) => t.group === "arquiteto").length})`,
          },
        ]}
      />

      <div className="lg:hidden">
        <label className="text-xs font-semibold text-muted-foreground">
          Template
        </label>
        <select
          value={current.key}
          onChange={(e) => setActiveKey(e.target.value as TransitionTemplateKey)}
          className="mt-1 w-full appearance-none bg-white border border-border rounded-xl py-3 px-4 text-sm font-bold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        >
          {visible.map((t) => (
            <option key={t.key} value={t.key}>
              {t.title}
              {!t.enabled ? " (desligado)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-4 items-start">
        <ul className="hidden lg:flex flex-col gap-1 rounded-xl border border-border/50 bg-white p-2 max-h-[70vh] overflow-y-auto">
          {visible.map((t) => {
            const active = t.key === current.key;
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveKey(t.key);
                    setInfo(null);
                  }}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="font-semibold block leading-snug">{t.title}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      active ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {t.enabled ? "Ativo" : "Desligado"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="space-y-4 min-w-0">
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

          <div className="rounded-xl border border-border/50 bg-white p-4 md:p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">{current.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{current.when}</p>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={current.enabled}
                disabled={isReadOnly}
                onChange={(e) => updateField("enabled", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Enviar este e-mail automaticamente
            </label>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Assunto
              </label>
              <Input
                value={current.subject}
                disabled={isReadOnly}
                onChange={(e) => updateField("subject", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Corpo
              </label>
              <textarea
                value={current.body}
                disabled={isReadOnly}
                onChange={(e) => updateField("body", e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                Placeholders
              </p>
              <div className="flex flex-wrap gap-1.5">
                {current.placeholders.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    title={p.label}
                    disabled={isReadOnly}
                    onClick={() =>
                      updateField("body", `${current.body}{{${p.key}}}`)
                    }
                    className="text-[11px] font-mono px-2 py-1 rounded-md border border-border/60 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-50"
                  >
                    {`{{${p.key}}}`}
                  </button>
                ))}
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="btn-metallic gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleReset()}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" /> Restaurar padrão
                </Button>
              </div>
            )}
          </div>

          {preview && (
            <div className="rounded-xl border border-border/50 bg-slate-50 p-4 md:p-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Prévia ao vivo
              </p>
              <p className="text-sm font-semibold text-foreground">
                Assunto: {preview.subject}
              </p>
              <iframe
                title="Prévia do e-mail"
                className="w-full h-[420px] rounded-lg border border-border/50 bg-white"
                sandbox=""
                srcDoc={preview.html}
              />
            </div>
          )}

          {!isReadOnly && (
            <div className="rounded-xl border border-border/50 bg-white p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Enviar e-mail de teste
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  className="sm:max-w-xs"
                />
                <Button
                  type="button"
                  onClick={() => void handleTest()}
                  disabled={testing || !testTo.includes("@")}
                  className="gap-1.5 bg-sky-700 hover:bg-sky-800 text-white"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar teste
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Usa dados de exemplo e prefixa o assunto com [TESTE].
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-white/70 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Outros e-mails automáticos (fora das transições)
        </p>
        <ul className="space-y-1.5 text-sm">
          {OTHER_AUTOMATED_EMAILS.map((item) => (
            <li key={item.title} className="text-slate-700">
              <span className="font-semibold">{item.title}</span>
              <span className="text-muted-foreground"> · {item.audience} — {item.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
