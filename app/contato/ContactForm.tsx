"use client";

import { FormEvent, useState } from "react";
import { buildContactWhatsAppUrl } from "@/lib/site";
import styles from "../page-simple.module.css";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [ambientes, setAmbientes] = useState("");
  const [tipo, setTipo] = useState("residencial");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const scope = [
      tipo === "corporativo" ? "Projeto corporativo/comercial." : "Projeto residencial.",
      ambientes.trim() || "(ainda não informado)",
    ].join(" ");
    window.open(buildContactWhatsAppUrl({ name, ambientes: scope }), "_blank", "noopener,noreferrer");
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label htmlFor="nome">Seu nome</label>
        <input
          id="nome"
          name="nome"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="tipo">Tipo de projeto</label>
        <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="residencial">Residência / apartamento</option>
          <option value="corporativo">Empresa / comercial</option>
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="ambientes">Quantos ambientes entram neste projeto?</label>
        <textarea
          id="ambientes"
          name="ambientes"
          placeholder="Ex.: cozinha, living, 2 dormitórios e closet"
          value={ambientes}
          onChange={(e) => setAmbientes(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Abrir WhatsApp
      </button>
      <p className={styles.hint}>
        A pergunta de escopo nos ajuda a saber se o projeto é integral — o nosso foco.
      </p>
    </form>
  );
}
