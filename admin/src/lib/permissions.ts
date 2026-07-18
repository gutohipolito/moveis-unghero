import type { Role } from "@prisma/client";

/**
 * Módulo = área/menu do sistema controlável por permissão.
 * A chave corresponde ao primeiro segmento da rota (ex.: "/marketing/analytics" -> "marketing").
 */
export interface ModuleDef {
  key: string;
  label: string;
  section: string;
}

/** Módulos cujo acesso é configurável por cargo (Diretoria sempre tem acesso total). */
export const CONFIGURABLE_MODULES: ModuleDef[] = [
  { key: "bi", label: "Relatórios", section: "Visão Geral" },
  { key: "marketing", label: "Marketing", section: "Marketing" },
  { key: "crm", label: "Funil Comercial", section: "Comercial" },
  { key: "clientes", label: "Clientes", section: "Comercial" },
  { key: "quotes", label: "Orçamentos", section: "Comercial" },
  { key: "produtos", label: "Produtos", section: "Comercial" },
  { key: "contratos", label: "Contratos", section: "Comercial" },
  { key: "parceiros", label: "Projetistas e Arquitetos", section: "Comercial" },
  { key: "agenda", label: "Agenda", section: "Produção" },
  { key: "factory", label: "Chão de Fábrica e Portal", section: "Produção" },
  { key: "chamados", label: "Chamados (Insumos)", section: "Produção" },
  { key: "estoque", label: "Estoque e Fornecedores", section: "Logística" },
  { key: "logistica", label: "Logística e Entrega", section: "Logística" },
  { key: "financeiro", label: "Financeiro", section: "Administração" },
  { key: "cadastros", label: "Cadastros do Sistema", section: "Administração" },
];

/** Módulos restritos à Diretoria (ADMIN) — nunca aparecem para outros cargos. */
export const ADMIN_ONLY_MODULES = new Set(["colaboradores", "settings", "permissoes"]);

/** Módulos liberados para qualquer colaborador, independente de configuração. */
export const ALWAYS_ALLOWED_MODULES = new Set(["melhorias"]);

export const CONFIGURABLE_MODULE_KEYS = CONFIGURABLE_MODULES.map((m) => m.key);

export const ALL_MODULE_KEYS = [
  ...CONFIGURABLE_MODULE_KEYS,
  ...Array.from(ADMIN_ONLY_MODULES),
  ...Array.from(ALWAYS_ALLOWED_MODULES),
];

/** Cargos que podem ter permissões editadas na matriz (ADMIN é sempre total). */
export const EDITABLE_ROLES: Role[] = ["COMERCIAL", "PROJETISTA", "PRODUCAO", "FINANCEIRO"];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Diretoria",
  COMERCIAL: "Comercial",
  PROJETISTA: "Projetista",
  PRODUCAO: "Fábrica",
  FINANCEIRO: "Financeiro",
};

/** Mapa persistido: cargo -> lista de chaves de módulos configuráveis permitidos. */
export type CompanyPermissions = Partial<Record<Role, string[]>>;

/** Extrai a chave de módulo a partir de um href (primeiro segmento da rota). */
export function moduleKeyForHref(href: string): string {
  return href.replace(/^\/+/, "").split("/")[0] || "";
}

/**
 * Resolve o conjunto de módulos que um cargo pode acessar.
 * - ADMIN: tudo (configuráveis + restritos).
 * - Outros cargos: o que estiver salvo; se nada foi configurado ainda, libera todos
 *   os módulos configuráveis (mantém o comportamento atual até o admin restringir).
 */
export function resolveAllowedModules(
  permissions: CompanyPermissions | null | undefined,
  role: Role
): string[] {
  if (role === "ADMIN") return ALL_MODULE_KEYS;

  const always = Array.from(ALWAYS_ALLOWED_MODULES);
  const configured = permissions?.[role];
  if (!configured) return [...CONFIGURABLE_MODULE_KEYS, ...always];

  // Mantém apenas chaves válidas e configuráveis, sempre incluindo as liberadas a todos.
  return [...configured.filter((k) => CONFIGURABLE_MODULE_KEYS.includes(k)), ...always];
}

/** Verifica se um cargo pode acessar um módulo específico. */
export function canAccessModule(
  permissions: CompanyPermissions | null | undefined,
  role: Role,
  moduleKey: string
): boolean {
  if (ALWAYS_ALLOWED_MODULES.has(moduleKey)) return true;
  if (ADMIN_ONLY_MODULES.has(moduleKey)) return role === "ADMIN";
  if (role === "ADMIN") return true;
  return resolveAllowedModules(permissions, role).includes(moduleKey);
}
