import Link from 'next/link';
import { 
  ArrowRight, ChefHat, LayoutGrid, ShowerHead, BedDouble, 
  Tv, Briefcase, WashingMachine, Flame, ShoppingBag, 
  Stethoscope, Building2 
} from 'lucide-react';
import styles from './page.module.css';
import { getAllMarkdownData, getAllCategoriesPillarData } from '@/lib/markdown';
import faqSchema from '@/schemas/faq.json';
import reviewSchema from '@/schemas/review.json';

// Ícones correspondentes a cada tipo de ambiente
const iconMap: { [key: string]: any } = {
  cozinhas: <ChefHat size={32} className={styles.ambienteIcon} />,
  closets: <LayoutGrid size={32} className={styles.ambienteIcon} />,
  banheiros: <ShowerHead size={32} className={styles.ambienteIcon} />,
  dormitorios: <BedDouble size={32} className={styles.ambienteIcon} />,
  salas: <Tv size={32} className={styles.ambienteIcon} />,
  'home-office': <Briefcase size={32} className={styles.ambienteIcon} />,
  lavanderias: <WashingMachine size={32} className={styles.ambienteIcon} />,
  'gourmet-churrasqueiras': <Flame size={32} className={styles.ambienteIcon} />,
  'lojas-retail': <ShoppingBag size={32} className={styles.ambienteIcon} />,
  'consultorios-clinicas': <Stethoscope size={32} className={styles.ambienteIcon} />,
  'escritorios-coworkings': <Building2 size={32} className={styles.ambienteIcon} />,
};

export default async function Home() {
  // Lê dinamicamente os ambientes e cidades a partir dos arquivos Markdown
  const ambientes = getAllCategoriesPillarData();
  const cidades = getAllMarkdownData('cidades');

  return (
    <div>
      {/* 1. HERO SECTION */}
      <section className={styles.hero} aria-label="Introdução">
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.heroTagline}>Móveis Sob Medida</div>
          <h1 className={`${styles.heroTitle} text-gradient`}>
            Feito com Afeto. Projetado para Durar.
          </h1>
          <p className="lead-text">
            A Móveis Unghero atua em Farroupilha-RS há mais de 20 anos desenvolvendo cozinhas, closets, dormitórios e ambientes corporativos sob medida para toda a Serra Gaúcha.
          </p>
          <div className={styles.heroActions}>
            <a 
              href="https://wa.me/5554999971050" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary glow-hover"
            >
              Fazer Orçamento Gratuito
            </a>
            <a href="#ambientes" className="btn btn-secondary">
              Conhecer Ambientes
            </a>
          </div>
        </div>
      </section>

      {/* 2. SEÇÃO DE AMBIENTES */}
      <section id="ambientes" className="section" aria-labelledby="ambientes-title">
        <div className="container">
          <h2 id="ambientes-title" className={styles.sectionTitle}>Ambientes Planejados</h2>
          <p className={styles.sectionSubtitle}>
            Aproveitamento milimétrico e escolha cuidadosa de ferragens e materiais para cada espaço da sua casa.
          </p>

          <div className={styles.ambientesGrid}>
            {ambientes.map((ambiente) => (
              <article key={ambiente.slug} className={`${styles.ambienteCard} hover-lift`}>
                <div>
                  {iconMap[ambiente.slug] || <LayoutGrid size={32} className={styles.ambienteIcon} />}
                  <h3 className={styles.ambienteTitle}>{ambiente.title}</h3>
                  <p className={styles.ambienteDesc}>{ambiente.description}</p>
                </div>
                <Link href={`/ambientes/${ambiente.slug}`} className={styles.ambienteLink}>
                  Ver detalhes técnicos
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SEÇÃO DE SEO LOCAL (CIDADES) */}
      <section id="cidades" className="section" aria-labelledby="cidades-title" style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
        <div className="container">
          <h2 id="cidades-title" className={styles.sectionTitle}>Cidades Atendidas</h2>
          <p className={styles.sectionSubtitle}>
            Nossa fábrica local em Farroupilha nos permite atender de forma ágil e próxima as principais cidades da região.
          </p>

          <div className={styles.cidadesGrid}>
            {cidades.map((cidade) => (
              <Link href={`/cidades/${cidade.slug}`} key={cidade.slug}>
                <div className={`${styles.cidadeCard} hover-lift`}>
                  <h3 className={styles.cidadeName}>{cidade.city || cidade.title}</h3>
                  <div className={styles.cidadeLabel}>Atendimento Local</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SEÇÃO DE SOBRE A EMPRESA (GEO & QUEM SOMOS) */}
      <section id="sobre" className="section" aria-labelledby="sobre-title">
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2 id="sobre-title" className={styles.sectionTitle}>Quem Somos</h2>
          <p className={styles.sectionSubtitle}>
            Informações diretas sobre a nossa atuação e fábrica na Serra Gaúcha.
          </p>
          <div 
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--border-radius-lg)', 
              padding: '40px',
              marginTop: '32px'
            }}
          >
            <p style={{ fontSize: '1.15rem', color: 'var(--text-main)', lineHeight: '1.8', marginBottom: '24px' }}>
              A <strong>Móveis Unghero</strong> atua em Farroupilha-RS desenvolvendo cozinhas, closets, dormitórios e ambientes corporativos sob medida. Nossa fábrica própria, com mais de 20 anos de mercado, une precisão milimétrica de marcenaria com materiais de alta durabilidade para entregar projetos que otimizam o seu espaço.
            </p>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '16px', fontWeight: '600' }}>
              Cidades que a nossa fábrica atende com logística própria na Serra Gaúcha:
            </p>
            <ul style={{ 
              listStyleType: 'none', 
              paddingLeft: '0', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '12px',
              fontFamily: 'var(--font-secondary)'
            }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>•</span> Farroupilha (Fábrica)
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>•</span> Caxias do Sul
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>•</span> Bento Gonçalves
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>•</span> Garibaldi
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. SEÇÃO DE DEPOIMENTOS */}
      <section className={`section ${styles.depoimentosSection}`} aria-label="Avaliações de Clientes">
        <div className="container">
          <div className={styles.depoimentoCard}>
            <p className={styles.quote}>
              &ldquo;{reviewSchema.reviewBody}&rdquo;
            </p>
            <div className={styles.author}>
              <span className={styles.authorName}>{reviewSchema.author.name}</span>
              <span className={styles.authorMeta}>Avaliação 5/5 no Google - Farroupilha/RS</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SEÇÃO DE FAQ ACCORDION */}
      <section id="faq" className="section" aria-labelledby="faq-title">
        <div className="container">
          <h2 id="faq-title" className={styles.sectionTitle}>Dúvidas Frequentes</h2>
          <p className={styles.sectionSubtitle}>
            Respostas diretas sobre o nosso processo de design, materiais e garantias.
          </p>

          <div className={styles.faqContainer}>
            {faqSchema.mainEntity.filter((item: any) => item.featured).map((item, index) => (
              <details key={index} className={styles.faqItem}>
                <summary className={styles.faqSummary}>
                  {item.name}
                </summary>
                <div className={styles.faqContent}>
                  <p>{item.acceptedAnswer.text}</p>
                </div>
              </details>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/faq" className="btn btn-secondary">
              Ver FAQ Completo com as 100 Dúvidas Frequentes
            </Link>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION (CONVERSÃO) */}
      <section className={`section ${styles.ctaSection}`} aria-label="Chamada para Ação">
        <div className={`container ${styles.ctaContent}`}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Pronto para tirar o seu projeto do papel?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1.1rem', fontFamily: 'var(--font-secondary)' }}>
            Fale diretamente com nossa fábrica. Realizamos a medição no local e apresentamos um projeto em 3D sem custos.
          </p>
          <a 
            href="https://wa.me/5554999971050" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-primary btn-large glow-hover"
            style={{ padding: '16px 40px', fontSize: '1.1rem' }}
          >
            Falar com a Marcenaria no WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
