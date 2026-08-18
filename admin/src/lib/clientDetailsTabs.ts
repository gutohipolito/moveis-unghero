export type ClientDetailsTab =
  | "overview"
  | "projects"
  | "finance"
  | "timeline"
  | "documents"
  | "notas";

const CLIENT_DETAILS_TABS = new Set<ClientDetailsTab>([
  "overview",
  "projects",
  "finance",
  "timeline",
  "documents",
  "notas",
]);

export function parseClientDetailsTab(value: string | undefined): ClientDetailsTab {
  if (value && CLIENT_DETAILS_TABS.has(value as ClientDetailsTab)) {
    return value as ClientDetailsTab;
  }
  return "overview";
}
