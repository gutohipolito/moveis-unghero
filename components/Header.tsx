"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./Header.module.css";

const NAV = [
  { href: "/sobre", label: "História" },
  { href: "/projetos", label: "Projetos" },
  { href: "/processo", label: "Processo" },
  { href: "/contato", label: "Contato" },
] as const;

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className={styles.navWrap}>
        <nav className={styles.pill} aria-label="Principal">
          <Link
            href="/"
            className={styles.logoLink}
            aria-label={`${SITE.name} — início`}
            onClick={() => setOpen(false)}
          >
            <Image
              src="/images/logo.png"
              alt="Móveis Unghero"
              width={120}
              height={44}
              className={styles.logo}
              priority
            />
          </Link>

          <div className={styles.links}>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={styles.link}>
                {item.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </nav>
      </div>

      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`} hidden={!open}>
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
      </div>
    </>
  );
}
