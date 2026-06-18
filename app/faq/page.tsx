import Link from 'next/link';
import { ChevronLeft, MessageSquare, HelpCircle } from 'lucide-react';
import faqSchema from '@/schemas/faq.json';
import styles from '../internas.module.css';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Dúvidas Frequentes | Móveis Unghero',
  description: 'Respostas completas para as principais dúvidas sobre o processo de orçamento, fabricação de móveis sob medida, materiais e garantia na Serra Gaúcha.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'Dúvidas Frequentes | Móveis Unghero',
    description: 'Respostas para as principais dúvidas sobre móveis planejados e sob medida na Serra Gaúcha.',
    url: 'https://moveisunghero.com.br/faq',
    type: 'website',
  }
};

export default function FaqPage() {
  // Gera os dados estruturados do FAQ para o Google
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

        <header className={styles.header}>
          <h1 className={`${styles.title} text-gradient`}>Dúvidas Frequentes</h1>
          <p className={styles.description}>
            Encontre respostas rápidas e claras sobre nossos prazos, garantias, materiais e como funciona o desenvolvimento do seu projeto 3D gratuito.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          {/* FAQ Accordion */}
          <div style={{ maxWidth: '800px', width: '100%' }}>
            {faqSchema.mainEntity.map((item, index) => (
              <details 
                key={index} 
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--border-radius-lg)', 
                  padding: '20px 24px', 
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
              >
                <summary 
                  style={{ 
                    fontSize: '1.15rem', 
                    fontWeight: '600', 
                    color: 'var(--text-main)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    listStyle: 'none',
                    outline: 'none'
                  }}
                >
                  <HelpCircle size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span>{item.name}</span>
                </summary>
                <div 
                  style={{ 
                    marginTop: '16px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid var(--border-color)', 
                    color: 'var(--text-muted)', 
                    lineHeight: '1.7', 
                    fontFamily: 'var(--font-secondary)',
                    fontSize: '1rem' 
                  }}
                >
                  <p>{item.acceptedAnswer.text}</p>
                </div>
              </details>
            ))}
          </div>

          {/* Sidebar CTA */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Ficou com alguma outra dúvida?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Fale diretamente com nossa fábrica. Atendemos no WhatsApp de forma rápida e humanizada para tirar todas as suas dúvidas.
            </p>
            <a 
              href="https://wa.me/5554999971050?text=Olá! Estava lendo o FAQ e gostaria de tirar uma dúvida sobre móveis sob medida."
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
