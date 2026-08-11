import Link from "next/link";
import { SITE, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <p className={styles.brandName}>
            <span className={styles.brandMark}>Móveis</span> Unghero
          </p>
          <p className={styles.tagline}>{SITE.tagline}</p>
        </div>

        <nav className={styles.col} aria-label="Rodapé">
          <p className={styles.colTitle}>Site</p>
          <Link href="/projetos">Projetos</Link>
          <Link href="/processo">Processo</Link>
          <Link href="/sobre">Sobre</Link>
          <Link href="/contato">Contato</Link>
        </nav>

        <div className={styles.col}>
          <p className={styles.colTitle}>Contato</p>
          <a href={buildContactWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
            {SITE.whatsappDisplay}
          </a>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <p className={styles.address}>{SITE.address}</p>
          <a
            href={SITE.partnerPortal}
            className={styles.partner}
            target="_blank"
            rel="noopener noreferrer"
          >
            Portal do parceiro
          </a>
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>
          © {year} {SITE.name}. CNPJ 13.415.510/0001-71.
        </p>
        <div className={styles.socials}>
          <a href="https://www.instagram.com/moveisunghero/" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a href="https://www.facebook.com/mvunghero" target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
        </div>
      </div>
    </footer>
  );
}
