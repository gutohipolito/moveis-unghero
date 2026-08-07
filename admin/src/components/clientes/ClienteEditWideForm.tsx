"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClientWizardData } from "@/app/(dashboard)/clientes/ClientWizard";
import type { Origin } from "@/app/actions/kanban";
import type { TipoPessoa } from "@/lib/clientDocument";
import { formatPhoneInput, PHONE_PLACEHOLDER } from "@/lib/phone";
import { labelOrigin, labelStatus } from "@/lib/navLabels";
import { normalizeBairro, normalizeCidade } from "@/lib/address";
import { fetchViaCep } from "@/lib/viaCep";
import CityField from "@/components/forms/CityField";
import BairroField from "@/components/forms/BairroField";

const ORIGINS: Origin[] = [
  "SITE",
  "INSTAGRAM",
  "INDICACAO",
  "GOOGLE",
  "WHATSAPP",
  "FACEBOOK",
  "FORMULARIO",
];
const STATUS_OPTIONS = ["LEAD", "EM_CONTATO", "NEGOCIACAO", "APROVADO", "INATIVO"];
const TIPO_IMOVEL_OPTIONS = [
  { value: "CASA", label: "Casa Residencial" },
  { value: "APARTAMENTO", label: "Apartamento" },
  { value: "COMERCIAL", label: "Comercial / Escritório" },
  { value: "SOBRADO", label: "Sobrado / Triplex" },
  { value: "OUTRO", label: "Outro" },
];

const fieldClass =
  "w-full h-9 border border-border bg-white rounded-[var(--radius-sm)] text-xs px-2.5 font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary";
const labelClass = "text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1";
const sectionTitle = "text-xs font-bold text-foreground mb-2";

function toForm(initial: Partial<ClientWizardData>): ClientWizardData {
  return {
    tipo_pessoa: (initial.tipo_pessoa as TipoPessoa) || "PF",
    documento: initial.documento || "",
    nome: initial.nome || "",
    email: initial.email || "",
    telefone: initial.telefone || "",
    cep: initial.cep || "",
    endereco: initial.endereco || "",
    numero: initial.numero || "",
    bairro: initial.bairro || "",
    cidade: initial.cidade || "",
    uf: initial.uf || "",
    tipo_imovel: initial.tipo_imovel || "CASA",
    origem: (initial.origem as Origin) || "INSTAGRAM",
    status: initial.status || "LEAD",
    observacoes: initial.observacoes || "",
    obs_imovel: initial.obs_imovel || "",
    obs_entrega: initial.obs_entrega || "",
  };
}

type Props = {
  initial: Partial<ClientWizardData>;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (data: ClientWizardData) => Promise<{ success: boolean; error?: string }>;
};

/** Formulário de edição em layout largo (mais largura do que altura). */
export default function ClienteEditWideForm({
  initial,
  saving = false,
  onCancel,
  onSubmit,
}: Props) {
  const [data, setData] = useState<ClientWizardData>(() => toForm(initial));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData(toForm(initial));
    setError(null);
  }, [initial.nome, initial.telefone, initial.documento, initial.cep]);

  const set = <K extends keyof ClientWizardData>(key: K, value: ClientWizardData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  async function fetchAddressByCep(cepValue: string) {
    const addr = await fetchViaCep(cepValue);
    if (!addr) return;
    const { cidade } = normalizeCidade(addr.localidade);
    setData((prev) => ({
      ...prev,
      endereco: addr.logradouro || prev.endereco,
      bairro: normalizeBairro(addr.bairro || prev.bairro, cidade) || prev.bairro,
      cidade: cidade || prev.cidade,
      uf: addr.uf || prev.uf,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!data.nome.trim() || !data.telefone.trim()) {
      setError("Preencha o nome e o telefone/WhatsApp.");
      return;
    }
    setLoading(true);
    const res = await onSubmit(data);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Não foi possível salvar.");
    }
  }

  const busy = loading || saving;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-2">
      <div>
        <h3 className="text-lg font-bold text-foreground">Editar cliente</h3>
        <p className="text-xs text-muted-foreground">
          Atualize o cadastro sem sair da ficha.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <section className="space-y-3 rounded-[var(--radius-md)] border border-border/70 bg-slate-50/40 p-3.5">
          <p className={sectionTitle}>Identificação</p>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className={labelClass}>Tipo</span>
              <select
                value={data.tipo_pessoa}
                onChange={(e) => set("tipo_pessoa", e.target.value as TipoPessoa)}
                className={fieldClass}
              >
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </label>
            <label>
              <span className={labelClass}>
                {data.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}
              </span>
              <Input
                value={data.documento}
                onChange={(e) => set("documento", e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>Nome</span>
            <Input
              required
              value={data.nome}
              onChange={(e) => set("nome", e.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className={labelClass}>Origem</span>
              <select
                value={data.origem}
                onChange={(e) => set("origem", e.target.value as Origin)}
                className={fieldClass}
              >
                {ORIGINS.map((o) => (
                  <option key={o} value={o}>
                    {labelOrigin(o)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Status</span>
              <select
                value={data.status}
                onChange={(e) => set("status", e.target.value)}
                className={fieldClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {labelStatus(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-[var(--radius-md)] border border-border/70 bg-slate-50/40 p-3.5">
          <p className={sectionTitle}>Contato e endereço</p>
          <label className="block">
            <span className={labelClass}>Telefone / WhatsApp</span>
            <Input
              required
              value={data.telefone}
              placeholder={PHONE_PLACEHOLDER}
              onChange={(e) => set("telefone", formatPhoneInput(e.target.value))}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>E-mail</span>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => set("email", e.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="grid grid-cols-[1fr_4.5rem] gap-2">
            <label>
              <span className={labelClass}>CEP</span>
              <Input
                value={data.cep}
                onChange={(e) => {
                  const cep = e.target.value.replace(/\D/g, "").slice(0, 8);
                  set("cep", cep);
                  if (cep.length === 8) void fetchAddressByCep(cep);
                }}
                className={fieldClass}
              />
            </label>
            <label>
              <span className={labelClass}>Nº</span>
              <Input
                value={data.numero}
                onChange={(e) => set("numero", e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>Logradouro</span>
            <Input
              value={data.endereco}
              onChange={(e) => set("endereco", e.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="grid grid-cols-[1fr_1fr_3.5rem] gap-2">
            <label className="min-w-0">
              <span className={labelClass}>Bairro</span>
              <BairroField
                value={data.bairro}
                cidade={data.cidade}
                onChange={(bairro) => set("bairro", bairro)}
                className={fieldClass}
              />
            </label>
            <label className="min-w-0">
              <span className={labelClass}>Cidade</span>
              <CityField
                value={data.cidade}
                onChange={(cidade) => set("cidade", cidade)}
                selectClassName={fieldClass}
                inputClassName={fieldClass}
              />
            </label>
            <label>
              <span className={labelClass}>UF</span>
              <Input
                value={data.uf}
                maxLength={2}
                onChange={(e) => set("uf", e.target.value.toUpperCase())}
                className={fieldClass}
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-[var(--radius-md)] border border-border/70 bg-slate-50/40 p-3.5">
          <p className={sectionTitle}>Imóvel e notas</p>
          <label className="block">
            <span className={labelClass}>Tipo de imóvel</span>
            <select
              value={data.tipo_imovel}
              onChange={(e) => set("tipo_imovel", e.target.value)}
              className={fieldClass}
            >
              {TIPO_IMOVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Obs. imóvel</span>
            <textarea
              value={data.obs_imovel}
              onChange={(e) => set("obs_imovel", e.target.value)}
              rows={2}
              className={`${fieldClass} h-auto py-2 resize-y`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Obs. entrega</span>
            <textarea
              value={data.obs_entrega}
              onChange={(e) => set("obs_entrega", e.target.value)}
              rows={2}
              className={`${fieldClass} h-auto py-2 resize-y`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Observações</span>
            <textarea
              value={data.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={3}
              className={`${fieldClass} h-auto py-2 resize-y`}
            />
          </label>
        </section>
      </div>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
          className="text-xs font-bold h-9 rounded-[var(--radius-sm)]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="text-xs font-bold h-9 rounded-[var(--radius-sm)] btn-metallic gap-1.5"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {busy ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
