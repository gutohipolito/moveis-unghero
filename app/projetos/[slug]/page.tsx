import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { getMarkdownData, getAllMarkdownData } from '@/lib/markdown';
import styles from '../../internas.module.css';
import type { Metadata } from 'next';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const projetos = getAllMarkdownData('projetos');
  return projetos.map((projeto) => ({
    slug: projeto.slug,
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = getMarkdownData('projetos', slug);
  if (!data) return {};

  return {
    title: `${data.title} | Projetos Móveis Unghero`,
    description: data.description,
    alternates: {
      canonical: `/projetos/${slug}`,
    },
    openGraph: {
      title: `${data.title} | Projetos Móveis Unghero`,
      description: data.description,
      url: `https://moveisunghero.com.br/projetos/${slug}`,
      type: 'article',
    }
  };
}

export default async function ProjetoDetailPage({ params }: Params) {
  const { slug } = await params;
  const data = getMarkdownData('projetos', slug);

  if (!data) {
    notFound();
  }

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
        "name": "Projetos",
        "item": "https://moveisunghero.com.br/projetos"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": data.title,
        "item": `https://moveisunghero.com.br/projetos/${slug}`
      }
    ]
  };

  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": data.title,
    "description": data.description,
    "image": data.image ? `https://moveisunghero.com.br${data.image}` : undefined,
    "author": {
      "@type": "Organization",
      "name": "Móveis Unghero",
      "url": "https://moveisunghero.com.br"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Móveis Unghero",
      "logo": {
        "@type": "ImageObject",
        "url": "https://moveisunghero.com.br/wp-content/uploads/2025/09/logo-moveis-unghero-2025.png"
      }
    },
    "creator": {
      "@type": "Organization",
      "name": "Móveis Unghero"
    }
  };

  return (
    <article className={styles.wrapper}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(creativeWorkSchema) }}
      />
      <div className="container">
        <Link href="/projetos" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para Projetos
        </Link>

        <header className={styles.header}>
          <h1 className={`${styles.title} text-gradient`}>{data.title}</h1>
          <p className={styles.description}>{data.description}</p>
        </header>

        {data.image && (
          <img 
            src={data.image} 
            alt={`Foto do projeto concluído ${data.title}`}
            className={styles.heroImage}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          <div>
            <div 
              className={styles.content}
              dangerouslySetInnerHTML={{ __html: data.htmlContent }}
            />

            {/* Caixa de Autoria E-E-A-T */}
            <div style={{
              marginTop: '48px',
              padding: '24px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#000',
                fontSize: '1.2rem',
                flexShrink: 0
              }}>
                MU
              </div>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1rem' }}>
                  Executado por <Link href="/nossos-especialistas" className="hover-underline" style={{ color: 'var(--accent)' }}>Móveis Unghero</Link>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
                  Este projeto foi integralmente fabricado em nossa sede própria em Farroupilha-RS com usinagem milimétrica de alto padrão e instalação dedicada.
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar CTA */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Deseja soluções parecidas com as do projeto {data.title} em sua casa?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Trabalhamos com ferragens de alto padrão com amortecimento e madeira com vedação anti-umidade para garantir a longevidade do seu móvel.
            </p>
            <a 
              href={`https://wa.me/5554999971050?text=Olá! Estava visualizando o projeto "${data.title}" no site e gostaria de conversar sobre algo parecido para minha casa.`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', gap: '8px' }}
            >
              <MessageSquare size={18} />
              Conversar no WhatsApp
            </a>
          </aside>
        </div>
      </div>
    </article>
  );
}
