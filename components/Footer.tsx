import Link from "next/link";
import { SITE, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <p className={styles.wordmark}>
          Unghero<span>{SITE.years}</span>
        </p>
        <nav className={styles.links} aria-label="Rodapé">
          <Link href="/projetos">Projetos</Link>
          <Link href="/processo">Processo</Link>
          <Link href="/sobre">Sobre</Link>
          <Link href="/contato">Contato</Link>
          <a href={buildContactWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </nav>
      </div>
      <div className={styles.meta}>
        <p>
          {SITE.address}
          <br />
          CNPJ 13.415.510/0001-71 · © {year}
        </p>
        <a href={SITE.partnerPortal} target="_blank" rel="noopener noreferrer">
          Parceiros
        </a>
      </div>
    </footer>
  );
}
