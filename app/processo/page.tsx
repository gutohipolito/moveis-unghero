import Link from "next/link";
import type { Metadata } from "next";
import { PROCESS_STEPS, SITE } from "@/lib/site";
import styles from "../page-simple.module.css";

export const metadata: Metadata = {
  title: "Processo",
  description: "Como a Móveis Unghero escolhe e conduz projetos integrais.",
  alternates: { canonical: "/processo" },
};

export default function ProcessoPage() {
  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <p className={styles.kicker}>Método</p>
          <h1 className={styles.title}>Do escopo à montagem</h1>
          <p className={styles.lead}>
            Priorizamos projetos em que a marcenaria percorre a residência ou o espaço comercial
            como um todo — não cômodos isolados sem continuidade.
          </p>
        </header>

        <ol className={styles.steps}>
          {PROCESS_STEPS.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.index}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2 className={styles.stepTitle}>{step.title}</h2>
                <p className={styles.stepText}>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <aside className={styles.callout}>
          <h2 className={styles.calloutTitle}>O que fica de fora</h2>
          <p>
            Um único cômodo pingado, urgência só por preço, obra sem continuidade. Se o seu caso for
            integral — <Link href="/contato">vamos conversar</Link>.
          </p>
        </aside>

        <p className={styles.note}>
          Arquitetos:{" "}
          <a href={SITE.partnerPortal} target="_blank" rel="noopener noreferrer">
            portal do parceiro
          </a>
          .
        </p>
      </div>
    </div>
  );
}
