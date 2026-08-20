"use client";

import { useMemo, useState } from "react";
import { Loader2, RotateCcw, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listEmailDocumentTemplates,
  previewEmailDocumentTemplate,
  resetEmailDocumentTemplate,
  sendTestDocumentEmail,
  upsertEmailDocumentTemplate,
  type EmailDocumentTemplateDTO,
} from "@/app/actions/emailDocumentTemplates";
import {
  EMAIL_DOCUMENT_PLACEHOLDERS,
  EMAIL_DOCUMENT_TEMPLATE_LABELS,
  type EmailDocumentTemplateType,
} from "@/lib/emailDocumentTemplates";

interface Props {
  initialTemplates: EmailDocumentTemplateDTO[];
}

export default function EmailDocumentTemplatesPanel({
  initialTemplates,
}: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeType, setActiveType] =
    useState<EmailDocumentTemplateType>("QUOTE");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [info, setInfo] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null
  );

  const current = useMemo(
    () => templates.find((t) => t.type === activeType)!,
    [templates, activeType]
  );

  const placeholders = EMAIL_DOCUMENT_PLACEHOLDERS.filter((p) =>
    p.types.includes(activeType)
  );

  const updateField = (field: "subject" | "body", value: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.type === activeType ? { ...t, [field]: value } : t))
    );
    setPreviewHtml(null);
    setPreviewSubject(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setInfo(null);
    const res = await upsertEmailDocumentTemplate({
      type: activeType,
      subject: current.subject,
      body: current.body,
    });
    setSaving(false);
    if (!res.success) {
      setInfo({ tone: "error", text: res.error || "Falha ao salvar." });
      return;
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.type === activeType ? { ...t, persisted: true } : t
      )
    );
    setInfo({ tone: "ok", text: "Template salvo." });
  };

  const handleReset = async () => {
    setSaving(true);
    setInfo(null);
    const res = await resetEmailDocumentTemplate(activeType);
    setSaving(false);
    if (!res.success) {
      setInfo({ tone: "error", text: res.error || "Falha ao restaurar." });
      return;
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.type === activeType
          ? {
              ...t,
              subject: res.subject,
              body: res.body,
              persisted: true,
            }
          : t
      )
    );
    setPreviewHtml(null);
    setInfo({ tone: "ok", text: "Padrão Unghero restaurado." });
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setInfo(null);
    const res = await previewEmailDocumentTemplate({
      type: activeType,
      subject: current.subject,
      body: current.body,
    });
    setPreviewLoading(false);
    if (!res.success) {
      setInfo({ tone: "error", text: res.error || "Falha na prévia." });
      return;
    }
    setPreviewHtml(res.html);
    setPreviewSubject(res.subject);
  };

  const handleTest = async () => {
    setTesting(true);
    setInfo(null);
    const res = await sendTestDocumentEmail({
      type: activeType,
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

  const refreshFromServer = async () => {
    const res = await listEmailDocumentTemplates();
    if (res.success) setTemplates(res.data);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(EMAIL_DOCUMENT_TEMPLATE_LABELS) as EmailDocumentTemplateType[]).map(
          (type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveType(type);
                setPreviewHtml(null);
                setPreviewSubject(null);
                setInfo(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                activeType === type
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-border/60 hover:bg-slate-50"
              }`}
            >
              {EMAIL_DOCUMENT_TEMPLATE_LABELS[type]}
            </button>
          )
        )}
      </div>

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
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Assunto
          </label>
          <Input
            value={current.subject}
            onChange={(e) => updateField("subject", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Corpo (texto)
          </label>
          <textarea
            value={current.body}
            onChange={(e) => updateField("body", e.target.value)}
            rows={12}
            className="w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
            Placeholders
          </p>
          <div className="flex flex-wrap gap-1.5">
            {placeholders.map((p) => (
              <button
                key={p.key}
                type="button"
                title={p.label}
                onClick={() =>
                  updateField("body", `${current.body}{{${p.key}}}`)
                }
                className="text-[11px] font-mono px-2 py-1 rounded-md border border-border/60 bg-slate-50 hover:bg-slate-100 text-slate-700"
              >
                {`{{${p.key}}}`}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Clique para inserir no final do corpo. HTML simples vale no envio:{" "}
            <code className="font-mono">&lt;b&gt;</code>,{" "}
            <code className="font-mono">&lt;i&gt;</code>,{" "}
            <code className="font-mono">&lt;u&gt;</code>,{" "}
            <code className="font-mono">&lt;br&gt;</code> e{" "}
            <code className="font-mono">&lt;a href=&quot;https://...&quot;&gt;</code>.
            O rodapé automático de documentos e a assinatura da caixa entram na hora do
            envio.
          </p>
        </div>

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
          <Button
            type="button"
            variant="outline"
            onClick={() => void handlePreview()}
            disabled={previewLoading}
            className="gap-1.5"
          >
            {previewLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Atualizar prévia
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-xs"
            onClick={() => void refreshFromServer()}
          >
            Recarregar
          </Button>
        </div>

        {(previewHtml || previewSubject) && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            {previewSubject && (
              <p className="text-sm font-semibold text-foreground">
                Assunto: {previewSubject}
              </p>
            )}
            {previewHtml && (
              <iframe
                title="Prévia do template"
                className="w-full h-[360px] rounded-lg border border-border/50 bg-white"
                sandbox=""
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"></head><body style="margin:0;padding:16px;background:#ffffff;">${previewHtml}</body></html>`}
              />
            )}
          </div>
        )}

        <div className="pt-3 border-t border-border/40 space-y-2">
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
            Usa dados de exemplo e prefixa o assunto com [TESTE]. Envia pela caixa
            Documentos (ou Comercial/Financeiro).
          </p>
        </div>
      </div>
    </div>
  );
}
