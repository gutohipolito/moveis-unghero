import Link from 'next/link';
import { ChevronLeft, ArrowRight, BookOpen, MessageSquare } from 'lucide-react';
import { getAllMarkdownData } from '@/lib/markdown';
import styles from '../internas.module.css';
import blogStyles from './blog.module.css';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Blog da Marcenaria | Móveis Unghero',
  description: 'Dicas de marcenaria sob medida, guia de materiais (MDF, acabamentos, ferragens) e ideias de design de interiores na Serra Gaúcha.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog da Marcenaria | Móveis Unghero',
    description: 'Dicas de marcenaria sob medida, guia de materiais e ideias de design de interiores na Serra Gaúcha.',
    url: 'https://moveisunghero.com.br/blog',
    type: 'website',
  }
};

export default async function BlogListPage() {
  const posts = getAllMarkdownData('blog');

  // Ordena os posts por data decrescente (do mais recente ao mais antigo)
  const sortedPosts = posts.sort((a, b) => {
    const dateA = new Date(a.date || '');
    const dateB = new Date(b.date || '');
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className={styles.wrapper}>
      <div className="container">
        <Link href="/" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para Início
        </Link>

        <header className={styles.header}>
          <h1 className={`${styles.title} text-gradient`}>Blog de Marcenaria & Design</h1>
          <p className={styles.description}>
            Guias práticos de materiais, durabilidade, especificações técnicas e inspirações para planejar seus móveis sob medida com qualidade e afeto.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          {sortedPosts.length > 0 ? (
            <div className={blogStyles.grid}>
              {sortedPosts.map((post) => (
                <article key={post.slug} className={blogStyles.card}>
                  {post.image && (
                    <Link href={`/blog/${post.slug}`} aria-hidden="true" tabIndex={-1}>
                      <img 
                        src={post.image} 
                        alt={post.title} 
                        className={blogStyles.cardImage} 
                      />
                    </Link>
                  )}
                  <div className={blogStyles.cardContent}>
                    <div className={blogStyles.meta}>
                      {post.category && <span>{post.category} • </span>}
                      {post.date && (
                        <time dateTime={post.date}>
                          {new Date(post.date).toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </time>
                      )}
                    </div>
                    <h2 className={blogStyles.postTitle}>
                      <Link href={`/blog/${post.slug}`} className="hover-underline">
                        {post.title}
                      </Link>
                    </h2>
                    <p className={blogStyles.excerpt}>{post.description}</p>
                    <Link href={`/blog/${post.slug}`} className={blogStyles.readMore}>
                      Ler post completo
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{ padding: '60px 0', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
              <BookOpen size={48} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '8px' }}>Nenhum post encontrado</h3>
              <p style={{ color: 'var(--text-muted)' }}>Em breve traremos novidades e artigos técnicos sobre móveis sob medida.</p>
            </div>
          )}

          {/* Sidebar CTA */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Gostaria de agendar um projeto sob medida para sua residência ou empresa?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Realizamos visitas semanais de orçamento na Serra Gaúcha e elaboramos o design do seu móvel em 3D de forma totalmente gratuita.
            </p>
            <a 
              href="https://wa.me/5554999971050?text=Olá! Estava lendo o blog da Móveis Unghero e gostaria de solicitar um orçamento."
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
    </div>
  );
}
