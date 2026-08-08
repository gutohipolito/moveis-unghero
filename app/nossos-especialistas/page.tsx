import Link from 'next/link';
import { ChevronLeft, MessageSquare, Award, Wrench, ShieldCheck, GraduationCap } from 'lucide-react';
import styles from '../internas.module.css';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Nossos Especialistas em Marcenaria | Móveis Unghero',
  description: 'Conheça a Móveis Unghero e a equipe de artesãos e designers por trás dos móveis sob medida de alto padrão produzidos em Farroupilha-RS há mais de 20 anos.',
  alternates: {
    canonical: '/nossos-especialistas',
  },
  openGraph: {
    title: 'Nossos Especialistas em Marcenaria | Móveis Unghero',
    description: 'A equipe de designers e mestres marceneiros por trás da marcenaria sob medida de alto padrão na Serra Gaúcha.',
    url: 'https://moveisunghero.com.br/nossos-especialistas',
    type: 'website',
  }
};

export default function NossosEspecialistasPage() {
  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Organization",
      "name": "Móveis Unghero",
      "image": "https://moveisunghero.com.br/images/cozinha-apartamento.jpg",
      "description": "Marceneiros e designers da Móveis Unghero, especialistas em marcenaria artesanal de alta precisão e móveis sob medida na Serra Gaúcha desde 2006.",
      "url": "https://moveisunghero.com.br",
      "knowsAbout": [
        "Marcenaria sob Medida",
        "Design de Interiores",
        "Vedação Anti-Umidade com Adesivo PUR",
        "Ergonomia Residencial e Corporativa",
        "Detalhamento Técnico de Projetos 3D"
      ]
    }
  };

  return (
    <div className={styles.wrapper}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }}
      />

      <div className="container">
        <Link href="/" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar para Início
        </Link>

        <header className={styles.header}>
          <h1 className={`${styles.title} text-gradient`}>Nossos Especialistas</h1>
          <p className={styles.description}>
            A precisão de marcenaria de alto padrão e a história da marcenaria familiar que há mais de 20 anos atende a Serra Gaúcha a partir da nossa fábrica própria em Farroupilha-RS.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }}>
          
          {/* Apresentação Principal E-E-A-T */}
          <div style={{ maxWidth: '800px', width: '100%' }}>
            <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '32px', color: 'var(--text-main)' }}>
              A <strong>Móveis Unghero</strong> une gerações dedicadas à arte da marcenaria sob medida. Longe da linguagem impessoal de grandes indústrias de modulados, cada projeto que entra em nossa fábrica recebe supervisão técnica detalhada e atenção artesanal direta.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', margin: '40px 0' }}>
              
              {/* Card Especialista 1 */}
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <Wrench size={24} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>Mestres Marceneiros</h3>
                </div>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontFamily: 'var(--font-secondary)', lineHeight: '1.6', margin: 0 }}>
                  Profissionais especializados na usinagem precisa do MDF, calibração milimétrica de maquinários alemães e colagem anti-umidade PUR. Garantem a robustez mecânica das estruturas de 18mm e 25mm.
                </p>
              </div>

              {/* Card Especialista 2 */}
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <GraduationCap size={24} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>Design & Ergonomia</h3>
                </div>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontFamily: 'var(--font-secondary)', lineHeight: '1.6', margin: 0 }}>
                  Especialistas em projeto e detalhamento técnico de interiores em 3D. Focados no aproveitamento milimétrico do espaço, harmonização cromática e especificações ergonômicas residenciais e regulamentos da ANVISA para B2B.
                </p>
              </div>

            </div>

            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Nosso Compromisso Técnico (E-E-A-T)
            </h2>

            <ul style={{ listStyle: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
              <li style={{ display: 'flex', gap: '16px' }}>
                <ShieldCheck size={24} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Fábrica Própria com Mais de 20 Anos de Mercado</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontFamily: 'var(--font-secondary)', marginTop: '4px', lineHeight: '1.6' }}>
                    Nossa fábrica está localizada no bairro Planalto em Farroupilha-RS desde 2006. Todo o maquinário, pintura e colagem ocorrem em sede própria, o que nos garante controle total de qualidade das matérias-primas e ferragens.
                  </p>
                </div>
              </li>
              <li style={{ display: 'flex', gap: '16px' }}>
                <Award size={24} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Especialistas em Prevenção contra Umidade e Clima</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontFamily: 'var(--font-secondary)', marginTop: '4px', lineHeight: '1.6' }}>
                    Conhecemos o inverno rigoroso e a alta umidade relativa do ar na Serra Gaúcha. Nossa marcenaria desenvolveu métodos de vedação das chapas de madeira com adesivos PUR reativos, impedindo fisicamente a entrada de umidade e vapores, estendendo a vida útil do móvel.
                  </p>
                </div>
              </li>
            </ul>

            <p style={{ fontSize: '1.05rem', lineHeight: '1.7', fontFamily: 'var(--font-secondary)', color: 'var(--text-muted)' }}>
              Se você deseja conhecer de perto nosso rigor de fabricação artesanal, convidamos você a agendar uma visita guiada à nossa fábrica em Farroupilha. Apresentaremos nossas soluções de ferragens telescópicas ocultas com amortecimento e nossa seleção de painéis melamínicos de dupla face de alta qualidade.
            </p>
          </div>

          {/* Sidebar CTA */}
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Gostaria de agendar uma conversa com nossos técnicos?</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              Elaboramos o design tridimensional em 3D do seu projeto de móveis sob medida sem custos adicionais. Agende pelo WhatsApp.
            </p>
            <a 
              href="https://wa.me/5554999971050?text=Olá! Estive lendo sobre a experiência dos especialistas da Móveis Unghero e gostaria de iniciar um projeto."
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', gap: '8px' }}
            >
              <MessageSquare size={18} />
              Conversar com Especialista
            </a>
          </aside>

        </div>
      </div>
    </div>
  );
}
