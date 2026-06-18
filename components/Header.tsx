"use client";

import Link from 'next/link';
import styles from './Header.module.css';
import { Menu, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`${styles.header} ${isScrolled ? 'glass' : ''}`} style={{
      backgroundColor: isScrolled ? 'rgba(12, 13, 15, 0.85)' : 'transparent',
      borderBottom: isScrolled ? '1px solid var(--border-color)' : '1px solid transparent'
    }}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label="Móveis Unghero Home">
          <span className={styles.logoText}>
            Móveis <span className={styles.logoAccent}>Unghero</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Navegação Principal">
          <Link href="/#ambientes" className={styles.navLink}>Ambientes</Link>
          <Link href="/#cidades" className={styles.navLink}>Cidades</Link>
          <Link href="/#sobre" className={styles.navLink}>Quem Somos</Link>
          <Link href="/#faq" className={styles.navLink}>Dúvidas</Link>
          
          <a 
            href="https://wa.me/5554999971050" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`${styles.contactBtn} btn`}
          >
            <Phone size={16} />
            Orçamento
          </a>
        </nav>

        <button 
          className={styles.mobileToggle} 
          aria-label="Abrir menu de navegação"
          onClick={() => {
            // Em uma implementação mais robusta, abriria o drawer mobile
            window.location.href = "https://wa.me/5554999971050";
          }}
        >
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}
