import Link from "next/link";
import { SITE, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <nav className={styles.links} aria-label="Rodapé">
          <Link href="/projetos">Projetos</Link>
          <Link href="/processo">Processo</Link>
          <Link href="/sobre">Sobre</Link>
          <Link href="/contato">Contato</Link>
          <a href={buildContactWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <a href={SITE.partnerPortal} target="_blank" rel="noopener noreferrer">
            Parceiros
          </a>
        </nav>
        <p className={styles.meta}>
          {SITE.address} · CNPJ 13.415.510/0001-71 · © {year}
        </p>
      </div>
    </footer>
  );
}
