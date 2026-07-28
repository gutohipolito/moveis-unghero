/** Swatches oficiais Zen Design (userfiles/acabamentos) — leves e compartilhados. */
export const ZEN_ACABAMENTO_IMAGES: Record<string, string> = {
  Amalfi: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-amalfi.jpg",
  "Anodizado Alumínio Fosco":
    "https://www.zendesign.com.br/userfiles/acabamentos/fosco-1.jpg",
  "Anodizado Alumínio Inox":
    "https://www.zendesign.com.br/userfiles/acabamentos/anodizado-aluminio-inox_29_2666.jpg",
  "Anodizado Preta": "https://www.zendesign.com.br/userfiles/acabamentos/preto.jpg",
  Azaleia: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-azaleia.jpg",
  Branco: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-branco.jpg",
  Bronze: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-bronze.jpg",
  Capuccino: "https://www.zendesign.com.br/userfiles/acabamentos/capuccino.jpg",
  Cobre: "https://www.zendesign.com.br/userfiles/acabamentos/cobre.jpg",
  "Couro Azul": "https://www.zendesign.com.br/userfiles/acabamentos/couro-azul.jpg",
  "Couro Branco": "https://www.zendesign.com.br/userfiles/acabamentos/couro-branco-1.jpg",
  "Couro Marrom": "https://www.zendesign.com.br/userfiles/acabamentos/couro-marrom.jpg",
  "Couro Preto": "https://www.zendesign.com.br/userfiles/acabamentos/couro-preto-1.jpg",
  "Couro Vermelho": "https://www.zendesign.com.br/userfiles/acabamentos/couro-vermelho.jpg",
  Cromo: "https://www.zendesign.com.br/userfiles/acabamentos/acabacromo.jpg",
  Damasco: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-damasco.jpg",
  "Dourado Matte": "https://www.zendesign.com.br/userfiles/acabamentos/acabadourado.jpg",
  Escovado: "https://www.zendesign.com.br/userfiles/acabamentos/acabacromo-escovado.jpg",
  Fieno: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-fieno.jpg",
  Fosco: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-fosco.jpg",
  Giallo: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-giallo.jpg",
  Gold: "https://www.zendesign.com.br/userfiles/acabamentos/acabagold-1.jpg",
  "Gold Escovado":
    "https://www.zendesign.com.br/userfiles/acabamentos/acabagold-escovado.jpg",
  Grafito: "https://www.zendesign.com.br/userfiles/acabamentos/grafito.jpg",
  Grigio: "https://www.zendesign.com.br/userfiles/acabamentos/grigio.jpg",
  Inox: "https://www.zendesign.com.br/userfiles/acabamentos/inox.jpg",
  "Inox Escovado":
    "https://www.zendesign.com.br/userfiles/acabamentos/inox-escovado_7_1892.jpg",
  "Inox Polido":
    "https://www.zendesign.com.br/userfiles/acabamentos/inox-polido_22_2265.jpg",
  Menta: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-menta.jpg",
  Moka: "https://www.zendesign.com.br/userfiles/acabamentos/moka.jpg",
  Nocciola: "https://www.zendesign.com.br/userfiles/acabamentos/nocciola.jpg",
  "Níquel Escovado":
    "https://www.zendesign.com.br/userfiles/acabamentos/acabaniquel-escovadojpg.jpg",
  "Níquel Velho":
    "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-niquel-velho-1.jpg",
  "Onix Escovado":
    "https://www.zendesign.com.br/userfiles/acabamentos/acabaonix-copiar.jpg",
  "Oro 24": "https://www.zendesign.com.br/userfiles/acabamentos/sem-titulo-1.jpg",
  "Ottone Vecchio":
    "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-ottone-vecchio.jpg",
  Panna: "https://www.zendesign.com.br/userfiles/acabamentos/panna.jpg",
  Preto: "https://www.zendesign.com.br/userfiles/acabamentos/acabamento-preto.jpg",
  "Rosê": "https://www.zendesign.com.br/userfiles/acabamentos/acabarose.jpg",
  "Rosê Escovado":
    "https://www.zendesign.com.br/userfiles/acabamentos/acabarose-esc.jpg",
  Safari: "https://www.zendesign.com.br/userfiles/acabamentos/safari.jpg",
  Titanium: "https://www.zendesign.com.br/userfiles/acabamentos/titanium.jpg",
  "Vecchio Cobre":
    "https://www.zendesign.com.br/userfiles/acabamentos/acabavecchio-cobre.jpg",
  "Vecchio Metallo":
    "https://www.zendesign.com.br/userfiles/acabamentos/metallo-vecchio-1.jpg",
};

export type ParsedShowcaseDescricao = {
  linha: string | null;
  acabamentos: string[];
  fonte: string | null;
  /** Texto comercial restante (sem Linha/Acabamentos/Fonte). */
  corpo: string | null;
};

function normalizeKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const LOOKUP = new Map(
  Object.entries(ZEN_ACABAMENTO_IMAGES).map(([k, v]) => [normalizeKey(k), { nome: k, url: v }])
);

export function resolveAcabamentoImage(nome: string): string | null {
  return LOOKUP.get(normalizeKey(nome))?.url ?? null;
}

export function parseShowcaseDescricao(descricao: string | null | undefined): ParsedShowcaseDescricao {
  if (!descricao?.trim()) {
    return { linha: null, acabamentos: [], fonte: null, corpo: null };
  }

  let linha: string | null = null;
  let fonte: string | null = null;
  let acabamentos: string[] = [];
  const body: string[] = [];

  for (const raw of descricao.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const linhaM = line.match(/^Linha:\s*(.+)$/i);
    if (linhaM) {
      linha = linhaM[1].trim();
      continue;
    }
    const fonteM = line.match(/^Fonte:\s*(.+)$/i);
    if (fonteM) {
      fonte = fonteM[1].trim();
      continue;
    }
    const acabM = line.match(/^Acabamentos?:\s*(.+)$/i);
    if (acabM) {
      acabamentos = acabM[1]
        .split(/;|·|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    // fallback: "Cores: a; b"
    const coresM = line.match(/^Cores?:\s*(.+)$/i);
    if (coresM && acabamentos.length === 0) {
      acabamentos = coresM[1]
        .split(/;|·|,|\|/)
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    body.push(line);
  }

  return {
    linha,
    acabamentos,
    fonte,
    corpo: body.length ? body.join("\n") : null,
  };
}

export type AcabamentoSwatch = {
  nome: string;
  imagem: string | null;
};

export function acabamentosToSwatches(names: string[]): AcabamentoSwatch[] {
  const seen = new Set<string>();
  const out: AcabamentoSwatch[] = [];
  for (const nome of names) {
    const key = normalizeKey(nome);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ nome, imagem: resolveAcabamentoImage(nome) });
  }
  return out;
}
