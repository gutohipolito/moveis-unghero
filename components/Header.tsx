"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./Header.module.css";

const NAV = [
  { href: "/projetos", label: "Projetos" },
  { href: "/processo", label: "Processo" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
] as const;

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`${styles.header} ${scrolled || open ? styles.solid : ""} ${open ? styles.open : ""}`}
    >
      <div className={styles.bar}>
        <Link
          href="/"
          className={styles.logoLink}
          aria-label={`${SITE.name} — início`}
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/logo.png"
            alt="Móveis Unghero"
            width={148}
            height={56}
            className={styles.logo}
            priority
          />
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
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.drawerLink}
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
        </nav>
      </div>
    </header>
  );
}
