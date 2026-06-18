import Link from 'next/link';
import styles from './Footer.module.css';
import { MapPin, Phone, Mail, Instagram, Facebook, Linkedin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <div className={styles.brandTitle}>
              Móveis <span className={styles.brandTitleAccent}>Unghero</span>
            </div>
            <p className={styles.description}>
              A Móveis Unghero atua em Farroupilha-RS há mais de 20 anos desenvolvendo cozinhas, closets, dormitórios e ambientes corporativos sob medida para toda a Serra Gaúcha.
            </p>
          </div>

          <div>
            <div className={styles.colTitle}>Ambientes</div>
            <ul className={styles.list}>
              <li><Link href="/ambientes/cozinhas" className={styles.link}>Cozinhas</Link></li>
              <li><Link href="/ambientes/closets" className={styles.link}>Closets & Roupeiros</Link></li>
              <li><Link href="/ambientes/banheiros" className={styles.link}>Banheiros</Link></li>
              <li><Link href="/ambientes/dormitorios" className={styles.link}>Dormitórios</Link></li>
            </ul>
          </div>

          <div>
            <div className={styles.colTitle}>Cidades</div>
            <ul className={styles.list}>
              <li><Link href="/cidades/farroupilha" className={styles.link}>Farroupilha</Link></li>
              <li><Link href="/cidades/caxias-do-sul" className={styles.link}>Caxias do Sul</Link></li>
              <li><Link href="/cidades/bento-goncalves" className={styles.link}>Bento Gonçalves</Link></li>
              <li><Link href="/cidades/garibaldi" className={styles.link}>Garibaldi</Link></li>
            </ul>
          </div>

          <div>
            <div className={styles.colTitle}>Contato</div>
            <div className={styles.contactInfo}>
              <address className={styles.contactInfo} style={{ fontStyle: 'normal' }}>
                <div className={styles.contactItem}>
                  <MapPin size={18} className={styles.contactIcon} aria-hidden="true" />
                  <span>Rua Cenira Cambruzzi, 155<br />Planalto, Farroupilha - RS<br />CEP 95170-308</span>
                </div>
                <div className={styles.contactItem}>
                  <Phone size={18} className={styles.contactIcon} aria-hidden="true" />
                  <a href="tel:+5554999971050" className={styles.link}>(54) 9 9997-1050</a>
                </div>
                <div className={styles.contactItem}>
                  <Mail size={18} className={styles.contactIcon} aria-hidden="true" />
                  <a href="mailto:moveisunghero@gmail.com" className={styles.link}>moveisunghero@gmail.com</a>
                </div>
              </address>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <div>
            &copy; {currentYear} Móveis Unghero. CNPJ: 13.415.510/0001-71. Todos os direitos reservados.
          </div>
          <div className={styles.socials} aria-label="Redes sociais da Móveis Unghero">
            <a href="https://www.facebook.com/mvunghero" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Facebook">
              <Facebook size={18} />
            </a>
            <a href="https://www.instagram.com/moveisunghero/" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="https://br.linkedin.com/company/mvunghero" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
