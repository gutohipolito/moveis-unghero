import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import ContactForm from "./ContactForm";
import styles from "../page-simple.module.css";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Converse sobre um projeto integral com a Móveis Unghero — residência completa ou empresa.",
  alternates: { canonical: "/contato" },
};

export default function ContatoPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Contato</p>
          <h1 className={styles.title}>Conversar sobre o projeto</h1>
          <p className={styles.lead}>
            Priorizamos projetos em que a marcenaria percorre a residência ou o espaço comercial como
            um todo — não cômodos isolados sem continuidade. Antes de tudo: quantos ambientes
            entram?
          </p>
        </header>

        <ContactForm />

        <div className={styles.contactList}>
          <p>
            WhatsApp:{" "}
            <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer">
              {SITE.whatsappDisplay}
            </a>
          </p>
          <p>
            E-mail: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </p>
          <p>{SITE.address}</p>
        </div>
      </div>
    </div>
  );
}
