import { isReadOnlyRole } from "@/lib/permissions";
import type { Role } from "@prisma/client";

/** Campos monetários — zerados para VIEWER (não vazam no JSON/RSC). */
const MONEY_KEYS = new Set([
  "valor",
  "valor_previsto",
  "valor_final",
  "valor_unitario",
  "valor_total",
  "valor_aprovado",
  "subtotal",
  "desconto",
  "pendingTotal",
  "approvedTotal",
  "receita",
  "recebido",
  "custo",
  "custoPago",
  "margem",
  "margemPct",
  "margemContribuicao",
  "resultado",
  "custosVariaveis",
  "despesasFixas",
  "totalDespesas",
  "totalReceita",
  "totalCusto",
  "totalMargem",
  "totalRecebido",
  "entrada_pct",
  /** Totais de categoria no DRE */
  "total",
]);

/** PII / contato / documento — esvaziados para VIEWER. */
const PII_KEYS = new Set([
  "telefone",
  "email",
  "cpf",
  "cnpj",
  "documento",
  "cliente_documento",
  "endereco",
  "cliente_endereco",
  "cep",
  "numero",
  "bairro",
  "uf",
  "clientPhone",
  "faixa_investimento",
  "ip",
  "user_agent",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  if (value instanceof Date) return false;
  return true;
}

function redactMoney(value: unknown): unknown {
  if (typeof value === "number") return 0;
  if (typeof value === "string") return "0";
  if (value && typeof value === "object" && "toNumber" in value) return 0;
  return 0;
}

function redactPii(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return "";
  return null;
}

/**
 * Remove valores sensíveis de um payload (deep).
 * Idempotente: reaplicar em dados já redigidos não muda o resultado.
 */
export function redactSensitivePayload<T>(data: T): T {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (!isPlainObject(node)) {
      return node;
    }

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (MONEY_KEYS.has(key)) {
        out[key] = redactMoney(value);
        continue;
      }
      if (PII_KEYS.has(key)) {
        out[key] = redactPii(value);
        continue;
      }
      out[key] = walk(value);
    }
    return out;
  };

  return walk(data) as T;
}

/** Aplica redação apenas para cargo VIEWER. */
export function maybeRedactForViewer<T>(data: T, cargo: Role | string | null | undefined): T {
  if (!isReadOnlyRole(cargo)) return data;
  return redactSensitivePayload(data);
}
