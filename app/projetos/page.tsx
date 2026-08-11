import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getAllCases } from "@/lib/cases";
import styles from "./projetos.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Projetos",
  description: "Ensaios de residências e empresas integrais — Móveis Unghero.",
  alternates: { canonical: "/projetos" },
};

export default function ProjetosPage() {
  const cases = getAllCases();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Portfólio</p>
        <h1 className={styles.title}>A obra completa</h1>
        <p className={styles.lead}>
          Só publicamos projetos em que a marcenaria atravessa o espaço — residência ou empresa —
          como uma linguagem só.
        </p>
      </header>

      <div className={styles.grid}>
        {cases.map((item) => (
          <Link key={item.slug} href={`/projetos/${item.slug}`} className={styles.card}>
            <div className={styles.visual}>
              <Image
                src={item.cover}
                alt=""
                fill
                sizes="(max-width: 800px) 100vw, 55vw"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className={styles.body}>
              <p className={styles.type}>
                {item.type === "corporativo" ? "Corporativo" : "Residencial"}
                {item.location ? ` · ${item.location}` : ""}
              </p>
              <h2 className={styles.cardTitle}>{item.title}</h2>
              <p className={styles.cardDesc}>{item.description}</p>
              <span className={styles.more}>Ensaio</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
