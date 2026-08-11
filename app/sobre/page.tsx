import type { Metadata } from "next";
import Image from "next/image";
import { SITE } from "@/lib/site";
import styles from "../page-simple.module.css";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "A Móveis Unghero fabrica marcenaria sob medida em Farroupilha há mais de 19 anos — foco em projetos integrais.",
  alternates: { canonical: "/sobre" },
};

export default function SobrePage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <p className={styles.eyebrow}>A marca</p>
          <h1 className={styles.title}>Ofício em Farroupilha desde 2006</h1>
          <p className={styles.lead}>
            {SITE.years} anos fabricando móveis sob medida na Serra Gaúcha — com fábrica própria e
            montagem pela equipe Unghero.
          </p>
        </header>

        <div
          style={{
            position: "relative",
            aspectRatio: "21 / 9",
            marginBottom: "2.5rem",
            overflow: "hidden",
            background: "var(--bg-elevated)",
          }}
        >
          <Image
            src="/images/cases/casa-sg/01-cozinha.jpeg"
            alt="Detalhe de marcenaria Móveis Unghero"
            fill
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className={styles.prose}>
          <p>
            Somos uma marcenaria familiar em Farroupilha. Preferimos fazer menos projetos e fazer
            bem — residências completas e espaços comerciais com identidade clara, em vez de
            espalhar a capacidade em cômodos isolados.
          </p>
          <p>
            Do projeto técnico à montagem, o trabalho passa pela nossa fábrica. Materiais e
            ferragens são escolhidos para durar; o prazo é alinhado com honestidade desde a
            conversa inicial.
          </p>
          <p>
            Atendemos a Serra Gaúcha a partir da sede em {SITE.address}. CNPJ 13.415.510/0001-71.
          </p>
        </div>
      </div>
    </div>
  );
}
