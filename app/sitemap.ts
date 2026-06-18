import { MetadataRoute } from 'next';
import { getAllMarkdownData } from '@/lib/markdown';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://moveisunghero.com.br';

  // Páginas estáticas principais
  const rotasEstaticas = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
  ];

  // Gera rotas para os ambientes
  const ambientes = getAllMarkdownData('ambientes');
  const rotasAmbientes = ambientes.map((amb) => ({
    url: `${baseUrl}/ambientes/${amb.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Gera rotas para as cidades (SEO Local)
  const cidades = getAllMarkdownData('cidades');
  const rotasCidades = cidades.map((cid) => ({
    url: `${baseUrl}/cidades/${cid.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...rotasEstaticas, ...rotasAmbientes, ...rotasCidades];
}
