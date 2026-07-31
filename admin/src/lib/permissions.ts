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
export const ADMIN_ONLY_MODULES = new Set([
  "colaboradores",
  "settings",
  "permissoes",
  "acessos",
]);

/** Módulos liberados para qualquer colaborador, independente de configuração. */
export const ALWAYS_ALLOWED_MODULES = new Set(["melhorias"]);

/** Notas da versão: liberadas por padrão para cargos comerciais/admin, não para ops. */
export const NOTES_MODULE = "notas-da-versao";

const NOTES_DEFAULT_ROLES = new Set<Role>([
  "COMERCIAL",
  "FINANCEIRO",
  "VIEWER",
]);

export const CONFIGURABLE_MODULE_KEYS = CONFIGURABLE_MODULES.map((m) => m.key);

export const ALL_MODULE_KEYS = [
  ...CONFIGURABLE_MODULE_KEYS,
  ...Array.from(ADMIN_ONLY_MODULES),
  ...Array.from(ALWAYS_ALLOWED_MODULES),
  NOTES_MODULE,
];

/** Cargos que podem ter permissões editadas na matriz (ADMIN é sempre total). */
export const EDITABLE_ROLES: Role[] = [
  "COMERCIAL",
  "PROJETISTA",
  "PRODUCAO",
  "FINANCEIRO",
  "VIEWER",
];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Diretoria",
  COMERCIAL: "Comercial",
  PROJETISTA: "Projetista",
  PRODUCAO: "Fábrica",
  FINANCEIRO: "Financeiro",
  VIEWER: "Somente leitura",
};

/** Cargo que só visualiza — sem mutações, sem olho aberto, sem PDF de orçamento. */
export function isReadOnlyRole(role: Role | string | null | undefined): boolean {
  return role === "VIEWER";
}

/**
 * Projetista e Fábrica (Marceneiro): visão operacional limitada
 * (clientes sem valores/financeiro; CRM a partir de Aprovados).
 */
export function isOpsLimitedRole(role: Role | string | null | undefined): boolean {
  return role === "PROJETISTA" || role === "PRODUCAO";
}

/**
 * Módulos que o VIEWER nunca acessa (mesmo se marcados na matriz).
 * Cadastros, financeiro e logística ficam fora do escopo de visualização.
 */
export const VIEWER_BLOCKED_MODULES = new Set([
  "cadastros",
  "estoque",
  "financeiro",
  "logistica",
]);

/**
 * Módulos padrão do VIEWER quando a matriz ainda não foi configurada.
 * Sem settings/colaboradores/permissoes (já bloqueados por ADMIN_ONLY).
 */
export const VIEWER_DEFAULT_MODULES = CONFIGURABLE_MODULE_KEYS.filter(
  (k) => !VIEWER_BLOCKED_MODULES.has(k)
);

/** Base operacional compartilhada entre Projetista e Fábrica. */
const OPS_BASE_MODULES = [
  "factory",
  "chamados",
  "produtos",
  "estoque",
  "logistica",
  "clientes",
  "crm",
] as const;

/**
 * Módulos que a Fábrica (Marceneiro) nunca acessa, mesmo se marcados na matriz.
 */
export const PRODUCAO_BLOCKED_MODULES = new Set(["parceiros"]);

/**
 * Defaults por cargo quando a matriz ainda não tem entrada para o role.
 * COMERCIAL/FINANCEIRO sem entrada continuam com todos os módulos configuráveis.
 */
export const ROLE_DEFAULT_MODULES: Partial<Record<Role, string[]>> = {
  PROJETISTA: [...OPS_BASE_MODULES, "parceiros", "marketing"],
  PRODUCAO: [...OPS_BASE_MODULES],
  VIEWER: [...VIEWER_DEFAULT_MODULES],
};

/** Mapa persistido: cargo -> lista de chaves de módulos configuráveis permitidos. */
export type CompanyPermissions = Partial<Record<Role, string[]>>;

/** Extrai a chave de módulo a partir de um href (primeiro segmento da rota). */
export function moduleKeyForHref(href: string): string {
  return href.replace(/^\/+/, "").split("/")[0] || "";
}

/** Defaults configuráveis para um cargo (matriz / restaurar padrões). */
export function getDefaultConfigurableModules(role: Role): string[] {
  if (ROLE_DEFAULT_MODULES[role]) {
    return [...ROLE_DEFAULT_MODULES[role]!];
  }
  return [...CONFIGURABLE_MODULE_KEYS];
}

/**
 * Resolve o conjunto de módulos que um cargo pode acessar.
 * - ADMIN: tudo (configuráveis + restritos).
 * - Outros: o que estiver salvo; se nada foi configurado, usa ROLE_DEFAULT_MODULES
 *   (ou todos os configuráveis para cargos sem default explícito).
 */
export function resolveAllowedModules(
  permissions: CompanyPermissions | null | undefined,
  role: Role
): string[] {
  if (role === "ADMIN") return ALL_MODULE_KEYS;

  const always = Array.from(ALWAYS_ALLOWED_MODULES);
  const configured = permissions?.[role];
  let modules: string[];
  if (!configured) {
    modules = getDefaultConfigurableModules(role);
  } else {
    modules = configured.filter((k) => CONFIGURABLE_MODULE_KEYS.includes(k));
  }

  if (role === "VIEWER") {
    modules = modules.filter((k) => !VIEWER_BLOCKED_MODULES.has(k));
  }

  if (role === "PRODUCAO") {
    modules = modules.filter((k) => !PRODUCAO_BLOCKED_MODULES.has(k));
  }

  const extras: string[] = [];
  if (NOTES_DEFAULT_ROLES.has(role)) {
    extras.push(NOTES_MODULE);
  }

  return [...modules, ...always, ...extras];
}

/** Apenas chaves configuráveis (para a UI da matriz de permissões). */
export function resolveConfigurableModules(
  permissions: CompanyPermissions | null | undefined,
  role: Role
): string[] {
  return resolveAllowedModules(permissions, role).filter((k) =>
    CONFIGURABLE_MODULE_KEYS.includes(k)
  );
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
