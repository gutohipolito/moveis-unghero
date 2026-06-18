import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MessageSquare, ArrowRight, LayoutGrid } from 'lucide-react';
import { getMarkdownData, getAmbienteCategories, getSubcategories } from '@/lib/markdown';
import styles from '../../internas.module.css';
import type { Metadata } from 'next';

interface Params {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  const categories = getAmbienteCategories();
  return categories.map((category) => ({
    category,
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const data = getMarkdownData(`ambientes/${category}`, 'index');
  if (!data) return {};

  return {
    title: `${data.title} | Móveis Unghero`,
    description: data.description,
    alternates: {
      canonical: `/ambientes/${category}`,
    },
    openGraph: {
      title: `${data.title} | Móveis Unghero`,
      description: data.description,
      url: `https://moveisunghero.com.br/ambientes/${category}`,
      type: "article",
    }
  };
}

export default async function CategoriaPage({ params }: Params) {
  const { category } = await params;
  const data = getMarkdownData(`ambientes/${category}`, 'index');

  if (!data) {
    notFound();
  }

  // Busca as subcategorias específicas desta categoria de ambiente
  const subcategorias = getSubcategories(category);

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
        "name": data.title,
        "item": `https://moveisunghero.com.br/ambientes/${category}`
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
        <Link href="/#ambientes" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para Início
        </Link>

        <header className={styles.header}>
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
          {/* Conteúdo Renderizado da Categoria Pilar */}
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: data.htmlContent }}
          />

          {/* Subcategorias (Cluster Fan-Out) */}
          {subcategorias.length > 0 && (
            <section style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', color: 'var(--text-main)' }}>Subcategorias e Tipos de Projetos</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontFamily: 'var(--font-secondary)' }}>
                Explore especificações mais detalhadas para variações de {data.title.toLowerCase()} que projetamos:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                {subcategorias.map((sub) => (
                  <div 
                    key={sub.slug} 
                    style={{ 
                      backgroundColor: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--border-radius-lg)', 
                      padding: '30px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '200px'
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-main)' }}>{sub.title}</h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'var(--font-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                        {sub.description}
                      </p>
                    </div>
                    <Link 
                      href={`/ambientes/${category}/${sub.slug}`} 
                      className={styles.backLink}
                      style={{ margin: 0, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      Ver especificações
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Lateral/CTA */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Gostaria de um projeto sob medida para {data.title.toLowerCase()}?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Fabricamos sob medida nas medidas milimétricas exatas do seu espaço. Agende uma conversa com a nossa fábrica sem compromisso.
            </p>
            <a 
              href={`https://wa.me/5554999971050?text=Olá! Gostaria de fazer um orçamento de ${data.title.toLowerCase()}.`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{ width: '100%' }}
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
