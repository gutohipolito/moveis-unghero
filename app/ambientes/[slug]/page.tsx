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
  const ambientes = getAllMarkdownData('ambientes');
  return ambientes.map((ambiente) => ({
    slug: ambiente.slug,
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = getMarkdownData('ambientes', slug);
  if (!data) return {};

  return {
    title: `${data.title} | Móveis Unghero`,
    description: data.description,
    alternates: {
      canonical: `/ambientes/${slug}`,
    },
    openGraph: {
      title: `${data.title} | Móveis Unghero`,
      description: data.description,
      url: `https://moveisunghero.com.br/ambientes/${slug}`,
      type: "article",
    }
  };
}

export default async function AmbientePage({ params }: Params) {
  const { slug } = await params;
  const data = getMarkdownData('ambientes', slug);

  if (!data) {
    notFound();
  }

  // Busca os outros ambientes para recomendação no final
  const todosAmbientes = getAllMarkdownData('ambientes');
  const outrosAmbientes = todosAmbientes.filter(a => a.slug !== slug);

  return (
    <article className={styles.wrapper}>
      <div className="container">
        <Link href="/#ambientes" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para Início
        </Link>

        <header className={styles.header}>
          <h1 className={`${styles.title} text-gradient`}>{data.title}</h1>
          <p className={styles.description}>{data.description}</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          {/* Conteúdo Renderizado do Markdown */}
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: data.htmlContent }}
          />

          {/* Lateral/Outros Ambientes e Chamada para Ação */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Gostaria de um orçamento para este ambiente?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Nossos projetistas realizam o desenvolvimento 3D sob medida para o seu espaço sem custos. Entre em contato diretamente com nossa fábrica.
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

            <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)' }}>Outros Ambientes</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {outrosAmbientes.map((amb) => (
                  <li key={amb.slug}>
                    <Link href={`/ambientes/${amb.slug}`} className={styles.backLink} style={{ margin: 0, fontSize: '0.95rem' }}>
                      {amb.title}
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
