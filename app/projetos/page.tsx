import Link from 'next/link';
import { ChevronLeft, ArrowRight, Camera, MessageSquare } from 'lucide-react';
import { getAllMarkdownData } from '@/lib/markdown';
import styles from '../internas.module.css';
import projStyles from './projetos.module.css';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Portfólio de Projetos | Móveis Unghero',
  description: 'Confira fotos e detalhes técnicos de projetos reais de marcenaria sob medida e móveis planejados executados pela Móveis Unghero na Serra Gaúcha.',
  alternates: {
    canonical: '/projetos',
  },
  openGraph: {
    title: 'Portfólio de Projetos | Móveis Unghero',
    description: 'Fotos e detalhes técnicos de projetos reais de marcenaria sob medida executados na Serra Gaúcha.',
    url: 'https://moveisunghero.com.br/projetos',
    type: 'website',
  }
};

export default async function ProjetosListPage() {
  const projetos = getAllMarkdownData('projetos');

  return (
    <div className={styles.wrapper}>
      <div className="container">
        <Link href="/" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para Início
        </Link>

        <header className={styles.header}>
          <h1 className={`${styles.title} text-gradient`}>Projetos Realizados</h1>
          <p className={styles.description}>
            Navegue por nossa galeria de projetos concluídos. Conheça as soluções de design, materiais e aproveitamento milimétrico de espaço que entregamos para nossos clientes.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          {projetos.length > 0 ? (
            <div className={projStyles.grid}>
              {projetos.map((projeto) => (
                <article key={projeto.slug} className={projStyles.card}>
                  {projeto.image && (
                    <img 
                      src={projeto.image} 
                      alt={projeto.title} 
                      className={projStyles.cardImage} 
                    />
                  )}
                  <div className={projStyles.overlay} />
                  <div className={projStyles.cardContent}>
                    <h2 className={projStyles.projectTitle}>{projeto.title}</h2>
                    <p className={projStyles.projectDesc}>{projeto.description}</p>
                    <Link href={`/projetos/${projeto.slug}`} className={projStyles.viewProject}>
                      Ver soluções do projeto
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{ padding: '60px 0', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
              <Camera size={48} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '8px' }}>Nenhum projeto encontrado</h3>
              <p style={{ color: 'var(--text-muted)' }}>Estamos organizando nossa galeria. Em breve adicionaremos fotos de novos projetos.</p>
            </div>
          )}

          {/* Sidebar CTA */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Gostaria de ver um projeto tridimensional (3D) para sua casa?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Nós elaboramos o projeto em 3D sem qualquer custo para você avaliar as cores, texturas e o aproveitamento real do seu espaço antes de produzir.
            </p>
            <a 
              href="https://wa.me/5554999971050?text=Olá! Estava olhando o portfólio de projetos e gostaria de agendar uma medição ou projeto 3D."
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', gap: '8px' }}
            >
              <MessageSquare size={18} />
              Solicitar Projeto 3D Grátis
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
}
