import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getAllCases } from "@/lib/cases";
import styles from "./projetos.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Projetos",
  description: "Residências e empresas integrais — Móveis Unghero.",
  alternates: { canonical: "/projetos" },
};

export default function ProjetosPage() {
  const cases = getAllCases();

  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <p className={styles.kicker}>Portfólio</p>
          <h1 className={styles.title}>A obra completa</h1>
          <p className={styles.lead}>
            Projetos em que a marcenaria atravessa o espaço — residência ou empresa — como uma
            linguagem só.
          </p>
        </header>

        <div className={styles.grid}>
          {cases.map((item) => (
            <Link key={item.slug} href={`/projetos/${item.slug}`} className={styles.card}>
              <div className={styles.visual}>
                <Image
                  src={item.cover}
                  alt={item.title}
                  fill
                  sizes="(max-width: 800px) 100vw, 55vw"
                />
              </div>
              <div className={styles.body}>
                <p className={styles.type}>
                  {item.type === "corporativo" ? "Corporativo" : "Residencial"}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
                <h2 className={styles.cardTitle}>{item.title}</h2>
                <p className={styles.cardDesc}>{item.description}</p>
                <span className={styles.more}>Abrir</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
