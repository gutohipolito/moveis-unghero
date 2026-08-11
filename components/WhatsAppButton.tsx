"use client";

import { MessageCircle } from "lucide-react";
import { buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./WhatsAppButton.module.css";

export default function WhatsAppButton() {
  return (
    <a
      href={buildContactWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.fab}
      aria-label="Conversar no WhatsApp sobre o projeto"
    >
      <MessageCircle size={22} />
    </a>
  );
}
