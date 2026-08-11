import Link from "next/link";
import Image from "next/image";
import { getFeaturedCases } from "@/lib/cases";
import { SITE, PROCESS_STEPS, PRIORITIES, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./page.module.css";

export default function HomePage() {
  const featured = getFeaturedCases(3);
  const heroSrc = featured[0]?.cover || "/images/cases/casa-sg/cover.jpg";

  return (
    <>
      <section className={styles.hero} aria-label="Apresentação">
        <div className={styles.heroMedia}>
          <Image
            src={heroSrc}
            alt="Marcenaria sob medida em residência completa"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div className={styles.heroShade} />
        </div>
        <div className={`container ${styles.heroContent}`}>
          <h1 className={`${styles.brandHero} reveal`}>
            <span>Móveis</span>
            Unghero
          </h1>
          <p className={`${styles.heroTitle} reveal reveal-delay-1`}>{SITE.headline}</p>
          <p className={`${styles.heroLead} reveal reveal-delay-2`}>{SITE.support}</p>
          <div className={`${styles.heroActions} reveal reveal-delay-3`}>
            <a
              href={buildContactWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Conversar sobre o projeto
            </a>
            <Link href="/projetos" className="btn btn-ghost">
              Ver projetos
            </Link>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="selecao-title">
        <div className="container">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Seleção</p>
            <h2 id="selecao-title" className={styles.sectionTitle}>
              Projetos que percorrem o espaço inteiro
            </h2>
            <p className={styles.sectionLead}>
              Residências e empresas — a mesma linguagem do primeiro ao último ambiente.
            </p>
          </header>
          <div className={styles.casesRail}>
            {featured.map((item) => (
              <Link key={item.slug} href={`/projetos/${item.slug}`} className={styles.caseCard}>
                <Image
                  src={item.cover}
                  alt={item.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 33vw"
                  style={{ objectFit: "cover" }}
                />
                <div className={styles.caseMeta}>
                  <p className={styles.caseType}>
                    {item.type === "corporativo" ? "Corporativo" : "Residencial"}
                  </p>
                  <h3 className={styles.caseTitle}>{item.title}</h3>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: "1.75rem" }}>
            <Link href="/projetos" className="btn btn-ghost">
              Todos os projetos
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-elevated)" }} aria-labelledby="prio-title">
        <div className="container">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>O que priorizamos</p>
            <h2 id="prio-title" className={styles.sectionTitle}>
              Capacidade limitada, escolha consciente
            </h2>
          </header>
          <ul className={styles.priorities}>
            {PRIORITIES.map((line) => (
              <li key={line} className={styles.priorityItem}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="processo-title">
        <div className="container">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Processo</p>
            <h2 id="processo-title" className={styles.sectionTitle}>
              Do primeiro contato à montagem
            </h2>
          </header>
          <div className={styles.steps}>
            {PROCESS_STEPS.map((step, i) => (
              <article key={step.title} className={styles.step}>
                <p className={styles.stepIndex}>0{i + 1}</p>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </article>
            ))}
          </div>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/processo" className="btn btn-ghost">
              Como trabalhamos
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.close} aria-label="Contato">
        <div className={styles.closeMedia}>
          <Image
            src="/images/cases/administrativo-reggla/01-escritorio.jpg"
            alt="Ambiente de marcenaria Unghero"
            fill
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div className={styles.closeShade} />
        </div>
        <div className={`container ${styles.closeContent}`}>
          <p className={styles.eyebrow}>Próximo passo</p>
          <h2 className={styles.sectionTitle}>Tem um projeto integral em mente?</h2>
          <p className={styles.sectionLead} style={{ marginBottom: "1.5rem" }}>
            Conte quantos ambientes entram — assim sabemos se faz sentido seguirmos juntos.
          </p>
          <a
            href={buildContactWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Ir para o contato
          </a>
        </div>
      </section>
    </>
  );
}
