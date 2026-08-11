import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllCases, getCaseBySlug } from "@/lib/cases";
import styles from "./case.module.css";

export const dynamic = "force-static";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllCases().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getCaseBySlug(slug);
  if (!item) return { title: "Projeto" };
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: `/projetos/${item.slug}` },
    openGraph: {
      title: item.title,
      description: item.description,
      images: [{ url: item.cover }],
    },
  };
}

export default async function CasePage({ params }: Props) {
  const { slug } = await params;
  const item = getCaseBySlug(slug);
  if (!item) notFound();

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.media}>
          <Image
            src={item.cover}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div className={styles.veil} aria-hidden />
        </div>
        <div className={styles.body}>
          <Link href="/projetos" className={styles.back}>
            Projetos
          </Link>
          <p className={styles.type}>
            {item.type === "corporativo" ? "Corporativo" : "Residencial"}
          </p>
          <h1 className={styles.title}>{item.title}</h1>
          {item.location ? <p className={styles.location}>{item.location}</p> : null}
        </div>
      </header>

      <div className={styles.content}>
        <p className={styles.intro}>{item.content.trim() || item.description}</p>
        {item.ambientes.length > 0 ? (
          <div className={styles.chips}>
            {item.ambientes.map((a) => (
              <span key={a} className={styles.chip}>
                {a}
              </span>
            ))}
          </div>
        ) : null}
        <div className={styles.gallery}>
          {item.gallery.map((src, i) => (
            <div key={`${src}-${i}`} className={styles.shot}>
              <Image
                src={src}
                alt={`${item.title} ${i + 1}`}
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
