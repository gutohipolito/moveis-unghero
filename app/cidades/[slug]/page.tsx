import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MapPin } from 'lucide-react';
import { getMarkdownData, getAllMarkdownData } from '@/lib/markdown';
import styles from '../../internas.module.css';
import type { Metadata } from 'next';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const cidades = getAllMarkdownData('cidades');
  return cidades.map((cidade) => ({
    slug: citySlugToParam(cidade.slug),
  }));
}

// Pequena função auxiliar para garantir compatibilidade
function citySlugToParam(slug: string) {
  return slug;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = getMarkdownData('cidades', slug);
  if (!data) return {};

  return {
    title: `${data.title} | Móveis Unghero`,
    description: data.description,
    alternates: {
      canonical: `/cidades/${slug}`,
    },
    openGraph: {
      title: `${data.title} | Móveis Unghero`,
      description: data.description,
      url: `https://moveisunghero.com.br/cidades/${slug}`,
      type: "article",
    }
  };
}

export default async function CidadePage({ params }: Params) {
  const { slug } = await params;
  const data = getMarkdownData('cidades', slug);

  if (!data) {
    notFound();
  }

  const todasCidades = getAllMarkdownData('cidades');
  const outrasCidades = todasCidades.filter(c => c.slug !== slug);

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
        "name": "Cidades",
        "item": "https://moveisunghero.com.br/#cidades"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": data.city || data.title,
        "item": `https://moveisunghero.com.br/cidades/${slug}`
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
        <Link href="/#cidades" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para Início
        </Link>

        <header className={styles.header}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', marginBottom: '16px', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
            <MapPin size={16} />
            SEO Local & Atendimento Integrado
          </div>
          <h1 className={`${styles.title} text-gradient`}>{data.title}</h1>
          <p className={styles.description}>{data.description}</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          {/* Conteúdo Renderizado do Markdown */}
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: data.htmlContent }}
          />

          {/* Lateral/Outras Localidades */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Atendimento na Região da Serra Gaúcha</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Nossa equipe técnica realiza visitas presenciais semanais nas cidades vizinhas para medições e vistorias de instalação.
            </p>
            <a 
              href={`https://wa.me/5554999971050?text=Olá! Resido em ${data.city || 'Serra Gaúcha'} e gostaria de fazer um orçamento de móveis sob medida.`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Agendar Medição Presencial
            </a>

            <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)' }}>Outras Localidades Atendidas</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {outrasCidades.map((cid) => (
                  <li key={cid.slug}>
                    <Link href={`/cidades/${cid.slug}`} className={styles.backLink} style={{ margin: 0, fontSize: '0.95rem' }}>
                      {cid.city || cid.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}
