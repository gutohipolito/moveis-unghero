import Link from "next/link";
import Image from "next/image";
import { getFeaturedCases, getAllCases } from "@/lib/cases";
import { SITE, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./page.module.css";

const CONCEPTS = [
  "Residência completa — uma linguagem do social ao íntimo",
  "Espaços comerciais com identidade coerente",
  "Poucos projetos por vez, acabamento e prazo honestos",
] as const;

export default function HomePage() {
  const featured = getFeaturedCases(3);
  const all = getAllCases();
  const cards = featured.length ? featured : all.slice(0, 3);
  const heroSrc = cards[0]?.cover || "/images/cases/casa-sg/cover.jpg";

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <section className={styles.hero} aria-label="Introdução">
          <div className={`${styles.heroMedia} anim-rise`}>
            <Image
              src={heroSrc}
              alt="Projeto de marcenaria integral"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 65vw"
            />
          </div>
          <div className={`${styles.heroCopy} anim-rise-2`}>
            <p className={styles.kicker}>Farroupilha · Serra Gaúcha</p>
            <h1 className={styles.heroTitle}>{SITE.headline}</h1>
            <p className={styles.heroLead}>{SITE.support}</p>
            <Link href="/projetos" className={styles.cta}>
              Ver projetos
            </Link>
          </div>
        </section>

        <section className={styles.manifesto} aria-label="Posicionamento">
          <div className={styles.boxLabel}>Posição</div>
          <div className={styles.boxBody}>
            <p>{SITE.manifesto}</p>
          </div>
        </section>

        <section className={styles.concepts} aria-label="Conceitos">
          {CONCEPTS.map((text, i) => (
            <article key={text} className={styles.concept}>
              <p className={styles.conceptIndex}>{String(i + 1).padStart(2, "0")}</p>
              <p className={styles.conceptText}>{text}</p>
            </article>
          ))}
        </section>

        <div className={styles.projectsHead}>
          <h2>Seleção</h2>
          <Link href="/projetos">Todos</Link>
        </div>

        <section className={styles.projectGrid} aria-label="Projetos">
          {cards.map((item) => (
            <Link key={item.slug} href={`/projetos/${item.slug}`} className={styles.projectCard}>
              <div className={styles.projectVisual}>
                <Image
                  src={item.cover}
                  alt={item.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                />
              </div>
              <div className={styles.projectMeta}>
                <p className={styles.projectType}>
                  {item.type === "corporativo" ? "Corporativo" : "Residencial"}
                </p>
                <h3 className={styles.projectTitle}>{item.title}</h3>
              </div>
            </Link>
          ))}
        </section>

        <section className={styles.filterRow} aria-label="Escopo">
          <div className={styles.filterText}>
            <p>{SITE.filterLine}</p>
          </div>
          <div className={styles.filterCta}>
            <span>Próximo passo</span>
            <a href={buildContactWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
              Conversar sobre o projeto
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
