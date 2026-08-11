import Link from "next/link";
import Image from "next/image";
import { getFeaturedCases, getAllCases } from "@/lib/cases";
import { SITE, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./page.module.css";

export default function HomePage() {
  const featured = getFeaturedCases(3);
  const all = getAllCases();
  const chapters = featured.length ? featured : all.slice(0, 3);
  const heroSrc = chapters[0]?.cover || "/images/cases/casa-sg/cover.jpg";
  const endSrc =
    all.find((c) => c.slug === "administrativo-reggla")?.cover ||
    "/images/cases/administrativo-reggla/cover.jpg";

  return (
    <>
      <section className={styles.hero} aria-label="Móveis Unghero">
        <div className={styles.media}>
          <Image
            src={heroSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div className={styles.veil} aria-hidden />
        </div>
        <div className={styles.copy}>
          <h1 className={`${styles.brand} anim-rise`}>
            <em>Móveis</em>
            Unghero
          </h1>
          <p className={`${styles.line} anim-rise-2`}>{SITE.headline}</p>
          <Link href="/projetos" className={`${styles.cta} anim-rise-3`}>
            Ver a obra
          </Link>
        </div>
      </section>

      <section className={styles.manifesto} aria-label="Posicionamento">
        <p className={styles.manifestoText}>{SITE.manifesto}</p>
      </section>

      <section className={styles.chapters} aria-label="Projetos em destaque">
        {chapters.map((item, i) => (
          <Link key={item.slug} href={`/projetos/${item.slug}`} className={styles.chapter}>
            <div className={styles.chapterMedia}>
              <Image
                src={item.cover}
                alt=""
                fill
                sizes="100vw"
                style={{ objectFit: "cover" }}
              />
              <div className={styles.chapterVeil} aria-hidden />
            </div>
            <div className={styles.chapterBody}>
              <p className={styles.index}>
                {String(i + 1).padStart(2, "0")} —{" "}
                {item.type === "corporativo" ? "Corporativo" : "Residencial"}
              </p>
              <h2 className={styles.chapterTitle}>{item.title}</h2>
              <p className={styles.chapterMeta}>
                {item.location}
                {item.ambientes?.length ? ` · ${item.ambientes.length} ambientes` : ""}
              </p>
              <span className={styles.chapterLink}>Abrir ensaio</span>
            </div>
          </Link>
        ))}
      </section>

      <section className={styles.filter} aria-label="Filtro de demanda">
        <p className={styles.filterLabel}>Escopo</p>
        <p className={styles.filterText}>{SITE.filterLine}</p>
        <Link href="/processo" className={styles.filterLink}>
          Como trabalhamos
        </Link>
      </section>

      <section className={styles.end} aria-label="Contato">
        <div className={styles.endMedia}>
          <Image src={endSrc} alt="" fill sizes="100vw" style={{ objectFit: "cover" }} />
          <div className={styles.endVeil} aria-hidden />
        </div>
        <div className={styles.endCopy}>
          <h2 className={styles.endTitle}>Vamos falar do seu projeto?</h2>
          <a
            href={buildContactWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.endCta}
          >
            Conversar
          </a>
        </div>
      </section>
    </>
  );
}
