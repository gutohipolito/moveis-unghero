import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { getMarkdownData, getAmbienteCategories, getSubcategories } from '@/lib/markdown';
import styles from '../../../internas.module.css';
import type { Metadata } from 'next';

interface Params {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  const categories = getAmbienteCategories();
  const params: { category: string; slug: string }[] = [];

  for (const category of categories) {
    const subs = getSubcategories(category);
    subs.forEach((sub) => {
      params.push({
        category,
        slug: sub.slug,
      });
    });
  }

  return params;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, slug } = await params;
  const data = getMarkdownData(`ambientes/${category}`, slug);
  if (!data) return {};

  return {
    title: `${data.title} | Móveis Unghero`,
    description: data.description,
    alternates: {
      canonical: `/ambientes/${category}/${slug}`,
    },
    openGraph: {
      title: `${data.title} | Móveis Unghero`,
      description: data.description,
      url: `https://moveisunghero.com.br/ambientes/${category}/${slug}`,
      type: "article",
    }
  };
}

export default async function SubcategoriaPage({ params }: Params) {
  const { category, slug } = await params;
  const data = getMarkdownData(`ambientes/${category}`, slug);
  const pilarData = getMarkdownData(`ambientes/${category}`, 'index');

  if (!data || !pilarData) {
    notFound();
  }

  const outrasSubcategorias = getSubcategories(category).filter(s => s.slug !== slug);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Início",
        "item": "https://moveisunghero.com.br"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Ambientes",
        "item": "https://moveisunghero.com.br/#ambientes"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": pilarData.title,
        "item": `https://moveisunghero.com.br/ambientes/${category}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": data.title,
        "item": `https://moveisunghero.com.br/ambientes/${category}/${slug}`
      }
    ]
  };

  return (
    <article className={styles.wrapper}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="container">
        <Link href={`/ambientes/${category}`} className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para {pilarData.title}
        </Link>

        <header className={styles.header}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', marginBottom: '16px', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
            Especificação de {pilarData.title}
          </div>
          <h1 className={`${styles.title} text-gradient`}>{data.title}</h1>
          <p className={styles.description}>{data.description}</p>
        </header>

        {data.image && (
          <img 
            src={data.image} 
            alt={`Foto de destaque do projeto de ${data.title.toLowerCase()}`}
            className={styles.heroImage}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          {/* Conteúdo Renderizado da Subcategoria */}
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: data.htmlContent }}
          />

          {/* Lateral/CTA */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Interessado em um projeto de {data.title.toLowerCase()}?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Nossa marcenaria fabrica móveis 100% personalizados para atender suas necessidades de estilo e organização.
            </p>
            <a 
              href={`https://wa.me/5554999971050?text=Olá! Estive lendo sobre ${data.title.toLowerCase()} no site de vocês e gostaria de fazer um projeto.`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <MessageSquare size={18} />
              Conversar no WhatsApp
            </a>

            {outrasSubcategorias.length > 0 && (
              <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)' }}>Outros tipos de {pilarData.title.toLowerCase()}</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {outrasSubcategorias.map((sub) => (
                    <li key={sub.slug}>
                      <Link href={`/ambientes/${category}/${sub.slug}`} className={styles.backLink} style={{ margin: 0, fontSize: '0.95rem' }}>
                        {sub.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </article>
  );
}
