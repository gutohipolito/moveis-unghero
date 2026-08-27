"use server";

import { prisma } from "@/lib/prisma";
import { getModuleAccess, getWriteAccess } from "@/lib/moduleAccess";
import { decryptVaultSecret } from "@/lib/accessVaultCrypto";
import { sendSmtpEmail } from "@/lib/emailSmtp";
import { composeBrandedEmail, renderEmailPlaceholders } from "@/lib/emailBrandedCard";
import {
  TRANSITION_TEMPLATE_DEFS,
  getTransitionTemplateDef,
  isTransitionEmailCurrentlyAllowed,
  isTransitionTemplateKey,
  sampleTransitionVars,
  type TransitionTemplateKey,
} from "@/lib/emailTransitionTemplates";
import { loadTransitionTemplate, resolveTransactionalMailbox } from "@/lib/projectTransitionEmail";
import { revalidatePath } from "next/cache";

export type EmailTransitionTemplateDTO = {
  key: TransitionTemplateKey;
  group: "cliente" | "arquiteto";
  title: string;
  description: string;
  when: string;
  ctaLabel: string;
  subject: string;
  body: string;
  enabled: boolean;
  persisted: boolean;
  placeholders: { key: string; label: string }[];
};

export async function listEmailTransitionTemplates(): Promise<{
  success: boolean;
  data: EmailTransitionTemplateDTO[];
  error?: string;
}> {
  const auth = await getModuleAccess("emails");
  if (!auth) {
    return { success: false, data: [], error: "Sem permissão." };
  }

  const rows = await prisma.emailTransitionTemplate.findMany({
    where: { company_id: auth.companyId },
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const data: EmailTransitionTemplateDTO[] = TRANSITION_TEMPLATE_DEFS.map(
    (def) => {
      const row = byKey.get(def.key);
      return {
        key: def.key,
        group: def.group,
        title: def.title,
        description: def.description,
        when: def.when,
        ctaLabel: def.ctaLabel,
        subject: row?.subject || def.subject,
        body: row?.body || def.body,
        enabled: isTransitionEmailCurrentlyAllowed(def.key)
          ? (row?.enabled ?? def.defaultEnabled)
          : false,
        persisted: Boolean(row),
        placeholders: def.placeholders,
      };
    }
  );

  return { success: true, data };
}

export async function upsertEmailTransitionTemplate(input: {
  key: string;
  subject: string;
  body: string;
  enabled: boolean;
}) {
  const auth = await getWriteAccess("emails");
  if (!auth) {
    return { success: false as const, error: "Sem permissão para editar." };
  }
  if (!isTransitionTemplateKey(input.key)) {
    return { success: false as const, error: "Template inválido." };
  }

  const subject = (input.subject || "").trim();
  const body = (input.body || "").trim();
  if (!subject) {
    return { success: false as const, error: "Informe o assunto." };
  }
  if (!body) {
    return { success: false as const, error: "Informe o corpo do e-mail." };
  }

  const enabled =
    isTransitionEmailCurrentlyAllowed(input.key) && input.enabled;

  await prisma.emailTransitionTemplate.upsert({
    where: {
      company_id_key: { company_id: auth.companyId, key: input.key },
    },
    create: {
      company_id: auth.companyId,
      key: input.key,
      subject,
      body,
      enabled,
    },
    update: { subject, body, enabled },
  });

  revalidatePath("/emails/templates");
  return { success: true as const };
}

export async function resetEmailTransitionTemplate(key: string) {
  const auth = await getWriteAccess("emails");
  if (!auth) {
    return { success: false as const, error: "Sem permissão para editar." };
  }
  if (!isTransitionTemplateKey(key)) {
    return { success: false as const, error: "Template inválido." };
  }

  const def = getTransitionTemplateDef(key);
  await prisma.emailTransitionTemplate.upsert({
    where: {
      company_id_key: { company_id: auth.companyId, key },
    },
    create: {
      company_id: auth.companyId,
      key,
      subject: def.subject,
      body: def.body,
      enabled: def.defaultEnabled,
    },
    update: {
      subject: def.subject,
      body: def.body,
      enabled: def.defaultEnabled,
    },
  });

  revalidatePath("/emails/templates");
  return {
    success: true as const,
    subject: def.subject,
    body: def.body,
    enabled: def.defaultEnabled,
  };
}

export async function sendTestTransitionEmail(input: {
  key: string;
  to: string;
  subject?: string;
  body?: string;
}) {
  const auth = await getWriteAccess("emails");
  if (!auth) {
    return { success: false as const, error: "Sem permissão para enviar." };
  }
  if (!isTransitionTemplateKey(input.key)) {
    return { success: false as const, error: "Template inválido." };
  }

  const to = (input.to || "").trim().toLowerCase();
  if (!to.includes("@")) {
    return { success: false as const, error: "Informe um e-mail de destino válido." };
  }

  const stored = await loadTransitionTemplate(auth.companyId, input.key);
  const def = getTransitionTemplateDef(input.key);
  const subjectTemplate = (input.subject ?? stored.subject).trim() || def.subject;
  const bodyTemplate = (input.body ?? stored.body).trim() || def.body;
  const vars = sampleTransitionVars(input.key);
  const composed = composeBrandedEmail({
    subject: renderEmailPlaceholders(subjectTemplate, vars),
    bodyText: renderEmailPlaceholders(bodyTemplate, vars),
    ctaLabel: def.ctaLabel,
    ctaHref: vars.link,
  });

  const mailbox = await resolveTransactionalMailbox(auth.companyId);
  if (!mailbox) {
    return {
      success: false as const,
      error: "Configure uma caixa SMTP ativa (Documentos, Atendimento ou Comercial).",
    };
  }

  let password: string;
  try {
    password = decryptVaultSecret(mailbox.password_enc);
  } catch {
    return { success: false as const, error: "Não foi possível ler a senha da caixa." };
  }

  const subject = `[TESTE] ${composed.subject}`;

  try {
    await sendSmtpEmail(
      {
        host: mailbox.smtp_host,
        port: mailbox.smtp_port,
        user: mailbox.address,
        pass: password,
      },
      {
        fromAddress: mailbox.address,
        fromName: mailbox.display_name,
        to,
        subject,
        text: composed.text,
        html: composed.html,
        replyTo: mailbox.address,
      }
    );
    return { success: true as const, to, from: mailbox.address };
  } catch (error) {
    console.error("sendTestTransitionEmail:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao enviar teste.",
    };
  }
}
