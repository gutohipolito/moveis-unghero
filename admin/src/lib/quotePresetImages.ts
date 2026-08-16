import { prisma } from "@/lib/prisma";
import { foldAccents } from "@/lib/address";

/** Mapa descrição normalizada → URL da imagem nos itens salvos (descrição). */
export async function loadPresetImageMapByDescricao(
  companyId: string,
  descricoes: string[]
): Promise<Map<string, string>> {
  const keys = Array.from(
    new Set(
      descricoes
        .map((d) => foldAccents(d || ""))
        .filter(Boolean)
    )
  );
  const map = new Map<string, string>();
  if (keys.length === 0) return map;

  const presets = await prisma.quoteItemPreset.findMany({
    where: {
      company_id: companyId,
      imagem_url: { not: null },
    },
    select: { descricao: true, imagem_url: true },
  });

  for (const preset of presets) {
    if (!preset.imagem_url) continue;
    const key = foldAccents(preset.descricao);
    if (!key) continue;
    // Só importa se algum item do orçamento usa essa descrição
    if (!keys.includes(key)) continue;
    if (!map.has(key)) map.set(key, preset.imagem_url);
  }

  return map;
}

export function resolvePresetImageUrl(
  map: Map<string, string>,
  descricao: string
): string | null {
  return map.get(foldAccents(descricao || "")) || null;
}
