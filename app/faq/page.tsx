import Link from 'next/link';
import { ChevronLeft, MessageSquare, HelpCircle, Bookmark } from 'lucide-react';
import faqSchema from '@/schemas/faq.json';
import styles from '../internas.module.css';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'FAQ Completo: 100 Dúvidas de Móveis Sob Medida | Móveis Unghero',
  description: 'O maior guia de dúvidas sobre móveis sob medida na Serra Gaúcha. Informações técnicas sobre materiais, MDF, MDP, prazos, garantias, instalação e manutenção.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'FAQ Completo: 100 Dúvidas de Móveis Sob Medida | Móveis Unghero',
    description: 'Guia completo com 100 perguntas e respostas sobre materiais, MDF, MDP, prazos, garantias, instalação e manutenção de móveis planejados.',
    url: 'https://moveisunghero.com.br/faq',
    type: 'website',
  }
};

const CATEGORIES_LABELS: { [key: string]: string } = {
  materiais: "Materiais & Ferragens",
  MDF: "Painéis de MDF",
  MDP: "Painéis de MDP",
  prazo: "Prazos & Etapas",
  garantia: "Garantia & Assistência",
  instalacao: "Entrega & Instalação",
  manutencao: "Limpeza & Manutenção"
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqSchema.mainEntity.map(item => ({
      "@type": "Question",
      "name": item.name,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.acceptedAnswer.text
      }
    }))
  };

  // Agrupa os itens do FAQ por categoria
  const groupedFaq: { [key: string]: any[] } = {
    materiais: [],
    MDF: [],
    MDP: [],
    prazo: [],
    garantia: [],
    instalacao: [],
    manutencao: []
  };

  faqSchema.mainEntity.forEach((item: any) => {
    let catKey = item.category;
    if (catKey === 'instalação') catKey = 'instalacao';
    if (catKey === 'manutenção') catKey = 'manutencao';
    
    if (groupedFaq[catKey]) {
      groupedFaq[catKey].push(item);
    } else {
      groupedFaq[catKey] = [item];
    }
  });

  const categoriasKeys = Object.keys(CATEGORIES_LABELS);

  return (
    <div className={styles.wrapper}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container">
        <Link href="/" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para Início
        </Link>

        <header className={styles.header} style={{ marginBottom: '32px' }}>
          <h1 className={`${styles.title} text-gradient`}>FAQ Gigante de Móveis Sob Medida</h1>
          <p className={styles.description}>
            Nosso banco de dados completo com exatamente 100 perguntas e respostas sobre materiais, MDF, MDP, prazos de entrega, coberturas de garantia, processo de montagem e dicas de conservação na Serra Gaúcha.
          </p>
        </header>

        {/* Menu rápido de navegação por categorias */}
        <nav 
          aria-label="Categorias do FAQ" 
          style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '10px', 
            marginBottom: '48px', 
            padding: '20px', 
            backgroundColor: 'var(--bg-card)', 
            borderRadius: 'var(--border-radius-lg)', 
            border: '1px solid var(--border-color)'
          }}
        >
          {categoriasKeys.map((key) => (
            <a 
              key={key} 
              href={`#${key}`}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'rgba(250, 178, 7, 0.08)',
                color: 'var(--accent)',
                fontSize: '0.9rem',
                fontWeight: '500',
                fontFamily: 'var(--font-secondary)',
                border: '1px solid rgba(250, 178, 7, 0.2)',
                transition: 'all 0.3s ease'
              }}
              className="hover-lift"
            >
              {CATEGORIES_LABELS[key]} ({groupedFaq[key]?.length || 0})
            </a>
          ))}
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          {/* Corpo do FAQ agrupado */}
          <div style={{ width: '100%' }}>
            {categoriasKeys.map((key) => {
              const items = groupedFaq[key] || [];
              if (items.length === 0) return null;

              return (
                <section 
                  key={key} 
                  id={key} 
                  style={{ 
                    marginBottom: '56px', 
                    scrollMarginTop: '120px'
                  }}
                >
                  <h2 
                    style={{ 
                      fontSize: '1.6rem', 
                      color: 'var(--accent)', 
                      borderBottom: '1px solid var(--border-color)', 
                      paddingBottom: '12px',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <Bookmark size={20} />
                    {CATEGORIES_LABELS[key]}
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    {items.map((item, idx) => (
                      <details 
                        key={idx} 
                        style={{ 
                          backgroundColor: 'var(--bg-card)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--border-radius-lg)', 
                          padding: '18px 24px', 
                          cursor: 'pointer'
                        }}
                      >
                        <summary 
                          style={{ 
                            fontSize: '1.05rem', 
                            fontWeight: '600', 
                            color: 'var(--text-main)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            listStyle: 'none',
                            outline: 'none'
                          }}
                        >
                          <HelpCircle size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          <span>{item.name}</span>
                        </summary>
                        <div 
                          style={{ 
                            marginTop: '14px', 
                            paddingTop: '14px', 
                            borderTop: '1px solid var(--border-color)', 
                            color: 'var(--text-muted)', 
                            lineHeight: '1.7', 
                            fontFamily: 'var(--font-secondary)',
                            fontSize: '0.98rem' 
                          }}
                        >
                          <p>{item.acceptedAnswer.text}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Sidebar CTA */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Ainda tem alguma dúvida específica sobre o seu projeto?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Nosso canal no WhatsApp está sempre aberto para responder dúvidas de design, layouts ou materiais. Fale conosco diretamente.
            </p>
            <a 
              href="https://wa.me/5554999971050?text=Olá! Estava consultando as 100 dúvidas frequentes do site e gostaria de tirar uma dúvida sobre meu projeto."
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
