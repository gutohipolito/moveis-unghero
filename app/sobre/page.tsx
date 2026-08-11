import type { Metadata } from "next";
import Image from "next/image";
import { SITE } from "@/lib/site";
import styles from "../page-simple.module.css";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Ofício em Farroupilha desde 2006 — Móveis Unghero.",
  alternates: { canonical: "/sobre" },
};

export default function SobrePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>A casa</p>
        <h1 className={styles.title}>Ofício, não volume</h1>
        <p className={styles.lead}>
          {SITE.years} em Farroupilha — fábrica própria, montagem nossa, poucos projetos por vez.
        </p>
      </header>

      <div className={styles.figure}>
        <Image
          src="/images/cases/casa-sg/01-cozinha.jpeg"
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>

      <div className={styles.prose}>
        <p>
          Somos uma marcenaria familiar. Preferimos residências completas e espaços comerciais com
          identidade clara a espalhar a capacidade em cômodos isolados.
        </p>
        <p>
          Do desenho técnico à montagem, o trabalho passa pela nossa oficina. Materiais e ferragens
          escolhidos para durar; prazo alinhado com honestidade na primeira conversa.
        </p>
        <p>
          {SITE.address}. CNPJ 13.415.510/0001-71.
        </p>
      </div>
    </div>
  );
}
