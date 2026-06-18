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
  const posts = getAllMarkdownData('blog');
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = getMarkdownData('blog', slug);
  if (!data) return {};

  return {
    title: `${data.title} | Blog Móveis Unghero`,
    description: data.description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: `${data.title} | Blog Móveis Unghero`,
      description: data.description,
      url: `https://moveisunghero.com.br/blog/${slug}`,
      type: 'article',
    }
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const data = getMarkdownData('blog', slug);

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
        "name": "Blog",
        "item": "https://moveisunghero.com.br/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": data.title,
        "item": `https://moveisunghero.com.br/blog/${slug}`
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
        <Link href="/blog" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para o Blog
        </Link>

        <header className={styles.header}>
          {data.date && (
            <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
              Postado em{' '}
              <time dateTime={data.date}>
                {new Date(data.date).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
              {data.category && <span> | Categoria: {data.category}</span>}
            </div>
          )}
          <h1 className={`${styles.title} text-gradient`}>{data.title}</h1>
          <p className={styles.description}>{data.description}</p>
        </header>

        {data.image && (
          <img 
            src={data.image} 
            alt={data.title}
            className={styles.heroImage}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          {/* Conteúdo do Blog */}
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: data.htmlContent }}
          />

          {/* Sidebar CTA */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Deseja tirar dúvidas ou solicitar orçamento de móveis planejados?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Nossos especialistas estão prontos para desenhar seu projeto em 3D sem custos e realizar medição no local na Serra Gaúcha.
            </p>
            <a 
              href={`https://wa.me/5554999971050?text=Olá! Estava lendo o artigo "${data.title}" e gostaria de orçar um móvel.`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', gap: '8px' }}
            >
              <MessageSquare size={18} />
              Chamar no WhatsApp
            </a>
          </aside>
        </div>
      </div>
    </article>
  );
}
