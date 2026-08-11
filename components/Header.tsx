"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./Header.module.css";

const NAV = [
  { href: "/projetos", label: "Projetos" },
  { href: "/processo", label: "Processo" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [overDark, setOverDark] = useState(false);

  const darkHeroRoute =
    pathname === "/" || Boolean(pathname?.match(/^\/projetos\/[^/]+$/));

  useEffect(() => {
    const onScroll = () => {
      if (!darkHeroRoute) {
        setOverDark(false);
        return;
      }
      setOverDark(window.scrollY < window.innerHeight * 0.7);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [darkHeroRoute]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`${styles.header} ${overDark && !open ? styles.onDark : styles.onPaper} ${
        open ? styles.open : ""
      }`}
    >
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          <span className={styles.brandSmall}>Móveis</span>
          <span className={styles.brandLarge}>Unghero</span>
        </Link>

        <nav className={styles.nav} aria-label="Principal">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-label={open ? "Fechar" : "Menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`} hidden={!open}>
        <nav className={styles.drawerNav}>
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.drawerLink}
              style={{ animationDelay: `${0.05 + i * 0.06}s` }}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={buildContactWhatsAppUrl()}
            className={styles.drawerCta}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Conversar
          </a>
          <p className={styles.drawerNote}>{SITE.tagline}</p>
        </nav>
      </div>
    </header>
  );
}
