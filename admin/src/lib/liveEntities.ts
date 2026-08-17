export const LIVE_ENTITIES = [
  "crm",
  "factory",
  "agenda",
  "quotes",
  "projects",
  "clients",
  "financeiro",
  "logistica",
  "estoque",
  "cadastros",
  "parceiros",
  "colaboradores",
  "bi",
  "portal",
  "workspace",
  "projectChat",
] as const;

export type LiveEntityKey = (typeof LIVE_ENTITIES)[number];

export type LiveVersions = Record<LiveEntityKey, string>;
