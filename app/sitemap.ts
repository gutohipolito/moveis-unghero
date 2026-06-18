import { MetadataRoute } from 'next';
import { getAmbienteCategories, getSubcategories, getAllMarkdownData } from '@/lib/markdown';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://moveisunghero.com.br';

  // 1. Rota Home
  const rotasEstaticas = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
  ];

  // 2. Rotas para Categorias de Ambientes Pilares
  const categorias = getAmbienteCategories();
  const rotasCategorias = categorias.map((cat) => ({
    url: `${baseUrl}/ambientes/${cat}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // 3. Rotas para Subcategorias de Ambientes Satélites (Fan-Out)
  const rotasSubcategorias: any[] = [];
  categorias.forEach((cat) => {
    const subs = getSubcategories(cat);
    subs.forEach((sub) => {
      rotasSubcategorias.push({
        url: `${baseUrl}/ambientes/${cat}/${sub.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      });
    });
  });

  // 4. Rotas para Cidades (SEO Local)
  const cidades = getAllMarkdownData('cidades');
  const rotasCidades = cidades.map((cid) => ({
    url: `${baseUrl}/cidades/${cid.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...rotasEstaticas, ...rotasCategorias, ...rotasSubcategorias, ...rotasCidades];
}
