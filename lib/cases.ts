import { getAllMarkdownData, getMarkdownData, type MarkdownData } from "@/lib/markdown";

export type CaseType = "residencial" | "corporativo";

export type ProjectCase = MarkdownData & {
  type: CaseType;
  featured?: boolean;
  order?: number;
  location?: string;
  cover: string;
  gallery: string[];
  ambientes: string[];
};

function normalizeCase(data: MarkdownData): ProjectCase {
  const gallery = Array.isArray(data.gallery)
    ? data.gallery.filter((g): g is string => typeof g === "string")
    : data.image
      ? [String(data.image)]
      : [];
  const cover =
    (typeof data.cover === "string" && data.cover) ||
    gallery[0] ||
    (typeof data.image === "string" ? data.image : "/images/logo.png");
  const ambientes = Array.isArray(data.ambientes)
    ? data.ambientes.filter((a): a is string => typeof a === "string")
    : [];

  return {
    ...data,
    type: data.type === "corporativo" ? "corporativo" : "residencial",
    featured: Boolean(data.featured),
    order: typeof data.order === "number" ? data.order : 99,
    location: typeof data.location === "string" ? data.location : undefined,
    cover,
    gallery: gallery.length ? gallery : [cover],
    ambientes,
  };
}

export function getAllCases(): ProjectCase[] {
  return getAllMarkdownData("projetos")
    .map(normalizeCase)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function getFeaturedCases(limit = 3): ProjectCase[] {
  const featured = getAllCases().filter((c) => c.featured);
  return (featured.length ? featured : getAllCases()).slice(0, limit);
}

export function getCaseBySlug(slug: string): ProjectCase | null {
  const data = getMarkdownData("projetos", slug);
  return data ? normalizeCase(data) : null;
}
