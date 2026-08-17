import { prisma } from "@/lib/prisma";
import { foldAccents } from "@/lib/address";

export type QuoteCatalogImage = {
  label: string;
  imagem_url: string;
};

function uniqueFoldedKeys(labels: string[]): string[] {
  return Array.from(
    new Set(labels.map((d) => foldAccents(d || "")).filter(Boolean))
  );
}

/**
 * Mapa texto normalizado → URL da imagem nos itens salvos
 * (descrições e detalhes).
 */
export async function loadPresetImageMap(
  companyId: string,
  labels: string[]
): Promise<Map<string, string>> {
  const keys = uniqueFoldedKeys(labels);
  const map = new Map<string, string>();
  if (keys.length === 0) return map;

  const [itemPresets, detailPresets] = await Promise.all([
    prisma.quoteItemPreset.findMany({
      where: { company_id: companyId, imagem_url: { not: null } },
      select: { descricao: true, imagem_url: true },
    }),
    prisma.quoteDetailPreset.findMany({
      where: { company_id: companyId, imagem_url: { not: null } },
      select: { texto: true, imagem_url: true },
    }),
  ]);

  for (const preset of itemPresets) {
    if (!preset.imagem_url) continue;
    const key = foldAccents(preset.descricao);
    if (!key || !keys.includes(key) || map.has(key)) continue;
    map.set(key, preset.imagem_url);
  }

  for (const preset of detailPresets) {
    if (!preset.imagem_url) continue;
    const key = foldAccents(preset.texto);
    if (!key || !keys.includes(key) || map.has(key)) continue;
    map.set(key, preset.imagem_url);
  }

  return map;
}

/** @deprecated Use loadPresetImageMap — mantido para callers antigos. */
export async function loadPresetImageMapByDescricao(
  companyId: string,
  descricoes: string[]
): Promise<Map<string, string>> {
  return loadPresetImageMap(companyId, descricoes);
}

export function resolvePresetImageUrl(
  map: Map<string, string>,
  label: string
): string | null {
  return map.get(foldAccents(label || "")) || null;
}

/** Cards do catálogo visual: descrições e detalhes com foto nos itens salvos. */
export function buildQuoteCatalogEntries(
  items: Array<{
    descricao: string;
    subitens?: string[] | null;
    status?: string | null;
  }>,
  imageMap: Map<string, string>
): QuoteCatalogImage[] {
  const seen = new Set<string>();
  const entries: QuoteCatalogImage[] = [];

  for (const item of items) {
    if (item.status === "RECUSADO") continue;
    const candidates = [item.descricao, ...(item.subitens || [])];
    for (const raw of candidates) {
      const label = (raw || "").trim();
      if (!label) continue;
      const key = foldAccents(label);
      const imagem_url = imageMap.get(key);
      if (!imagem_url || seen.has(key)) continue;
      seen.add(key);
      entries.push({ label, imagem_url });
    }
  }

  return entries;
}

export function collectQuoteImageLabels(
  items: Array<{ descricao: string; subitens?: string[] | null }>
): string[] {
  const labels: string[] = [];
  for (const item of items) {
    if (item.descricao) labels.push(item.descricao);
    for (const sub of item.subitens || []) {
      if (sub) labels.push(sub);
    }
  }
  return labels;
}
