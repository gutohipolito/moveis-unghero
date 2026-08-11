import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getAllCases } from "@/lib/cases";
import styles from "./projetos.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Projetos",
  description:
    "Residências e empresas completas — portfólio de marcenaria integrada da Móveis Unghero.",
  alternates: { canonical: "/projetos" },
};

export default function ProjetosPage() {
  const cases = getAllCases();

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Portfólio</p>
          <h1 className={styles.title}>Projetos integrais</h1>
          <p className={styles.lead}>
            Só publicamos obras em que a marcenaria percorre a residência ou o espaço comercial como
            um todo — não cômodos isolados.
          </p>
        </header>

        <div className={styles.grid}>
          {cases.map((item) => (
            <Link key={item.slug} href={`/projetos/${item.slug}`} className={styles.card}>
              <Image
                src={item.cover}
                alt={item.title}
                fill
                sizes="(max-width: 700px) 100vw, 50vw"
                style={{ objectFit: "cover" }}
              />
              <div className={styles.meta}>
                <p className={styles.type}>
                  {item.type === "corporativo" ? "Corporativo" : "Residencial"}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
                <h2 className={styles.cardTitle}>{item.title}</h2>
                <p className={styles.cardDesc}>{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
