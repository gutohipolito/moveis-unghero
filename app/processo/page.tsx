import Link from "next/link";
import type { Metadata } from "next";
import { PROCESS_STEPS, SITE } from "@/lib/site";
import styles from "../page-simple.module.css";

export const metadata: Metadata = {
  title: "Processo",
  description:
    "Como a Móveis Unghero conduz projetos integrais — do primeiro contato à montagem.",
  alternates: { canonical: "/processo" },
};

export default function ProcessoPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Como trabalhamos</p>
          <h1 className={styles.title}>Processo claro, escopo consciente</h1>
          <p className={styles.lead}>
            Priorizamos projetos em que a marcenaria percorre a residência ou o espaço comercial como
            um todo — não cômodos isolados sem continuidade. Assim usamos bem o tempo da fábrica e
            entregamos uma linguagem coerente.
          </p>
        </header>

        <ol className={styles.steps}>
          {PROCESS_STEPS.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.index}>0{i + 1}</span>
              <div>
                <h2 className={styles.stepTitle}>{step.title}</h2>
                <p className={styles.stepText}>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <aside className={styles.callout}>
          <h2 className={styles.calloutTitle}>O que não priorizamos</h2>
          <p>
            Pedidos de um único cômodo “pingado”, urgências só por preço ou obras sem continuidade
            de projeto. Se o seu caso for integral — casa, apto ou empresa —{" "}
            <Link href="/contato">vamos conversar</Link>.
          </p>
        </aside>

        <p className={styles.note}>
          Arquitetos e projetistas: o portal do parceiro fica em{" "}
          <a href={SITE.partnerPortal} target="_blank" rel="noopener noreferrer">
            moveisunghero.com.br/parceiro
          </a>
          .
        </p>
      </div>
    </div>
  );
}
