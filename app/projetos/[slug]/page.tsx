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

  return (
    <article className={styles.wrapper}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
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
          {/* Conteúdo Renderizado do Markdown */}
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: data.htmlContent }}
          />

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
