"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";
import { normalizeAddressFields } from "@/lib/address";
import type { TipoPessoa } from "@/lib/clientDocument";
import { findExistingClient, resolveClientContactFields } from "@/lib/clientMatch";
import { stripConsentFromObservacoes } from "@/lib/clientConsent";
import { isValidBrPhoneDigits } from "@/lib/phone";
import {
  FORM_FIELD_LIMITS,
  cleanCepDigits,
  truncateField,
  validateOptionalCep,
  validateOptionalCnpj,
  validateOptionalCpf,
} from "@/lib/brDocuments";
import { normalizeEmailInput, validateOptionalEmail } from "@/lib/email";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import { resolvePartnerByInviteCode } from "@/lib/partnerInvite";
import { sendSignupConfirmationEmail } from "@/lib/signupConfirmationEmail";
import { headers } from "next/headers";

export interface ClientSignupData {
  tipo_pessoa?: TipoPessoa;
  documento?: string;
  nome: string;
  email?: string;
  telefone: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  tipo_imovel?: string;
  observacoes?: string;
  company_id?: string;
  lgpd_aceite?: boolean;
  marketing_aceite?: boolean;
  /** Código do link /a/[code] — atribui ao arquiteto. */
  partnerInviteCode?: string;
}

export async function submitPublicClientSignupAction(data: ClientSignupData) {
  try {
    const ip = getRequestIp(await headers());
    const rate = checkRateLimit(`public-client-signup:${ip}`, {
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.ok) {
      return {
        success: false,
        error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente novamente.`,
      };
    }

    const nome = truncateField(data.nome || "", FORM_FIELD_LIMITS.nome);
    const telefone = data.telefone?.trim() || "";

    if (!nome || nome.length < 3) {
      return { success: false, error: "Informe seu nome completo." };
    }
    if (!telefone) {
      return { success: false, error: "Informe um telefone/WhatsApp para contato." };
    }
    if (!isValidBrPhoneDigits(telefone)) {
      return {
        success: false,
        error: "Informe um telefone válido com DDD (fixo ou celular).",
      };
    }

    const emailError = validateOptionalEmail(data.email || "");
    if (emailError) {
      return { success: false, error: emailError };
    }

    if (!data.lgpd_aceite) {
      return {
        success: false,
        error: "É necessário aceitar o tratamento de dados (LGPD) para concluir o cadastro.",
      };
    }

    // Ignora company_id do cliente (IDOR / tenant pollution).
    const companyId = resolvePublicCompanyId();

    let partnerId: string | null = null;
    if (data.partnerInviteCode?.trim()) {
      const partner = await resolvePartnerByInviteCode(data.partnerInviteCode);
      if (!partner || partner.company_id !== companyId) {
        return { success: false, error: "Link de indicação inválido ou expirado." };
      }
      partnerId = partner.id;
    }

    const tipoPessoa: TipoPessoa = data.tipo_pessoa === "PJ" ? "PJ" : "PF";
    const docError =
      tipoPessoa === "PJ"
        ? validateOptionalCnpj(data.documento || "")
        : validateOptionalCpf(data.documento || "");
    if (docError) {
      return { success: false, error: docError };
    }

    const cepError = validateOptionalCep(data.cep || "");
    if (cepError) {
      return { success: false, error: cepError };
    }

    const documentoDigits = data.documento?.replace(/\D/g, "") || "";
    const cpf = tipoPessoa === "PF" ? documentoDigits || null : null;
    const cnpj = tipoPessoa === "PJ" ? documentoDigits || null : null;
    const emailNormalized = normalizeEmailInput(data.email || "") || undefined;
    const cepDigits = cleanCepDigits(data.cep || "");
    const cepFormatted = cepDigits ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : null;

    const existing = await findExistingClient({
      companyId,
      telefone,
      email: emailNormalized,
      cpf: cpf || undefined,
      cnpj: cnpj || undefined,
    });

    if (existing) {
      if (partnerId) {
        const current = await prisma.client.findUnique({
          where: { id: existing.id },
          select: { partner_id: true },
        });
        if (current && !current.partner_id) {
          await prisma.client.update({
            where: { id: existing.id },
            data: {
              partner_id: partnerId,
              partner_attributed_at: new Date(),
            },
          });
          revalidatePath("/clientes");
          revalidatePath("/parceiro/clientes");
          return {
            success: true,
            id: existing.id,
            attributedExisting: true,
          };
        }
      }
      return {
        success: false,
        error:
          "Já existe um cadastro com este telefone, e-mail ou documento. Nossa equipe entrará em contato em breve.",
      };
    }

    const contact = resolveClientContactFields(telefone, emailNormalized);
    const observacoes = stripConsentFromObservacoes(
      truncateField(data.observacoes || "", FORM_FIELD_LIMITS.observacoes)
    );

    const address = normalizeAddressFields({
      cidade: truncateField(data.cidade || "", FORM_FIELD_LIMITS.cidade),
      bairro: truncateField(data.bairro || "", FORM_FIELD_LIMITS.bairro),
      uf: data.uf,
      endereco: truncateField(data.endereco || "", FORM_FIELD_LIMITS.endereco),
    });

    const attributedAt = partnerId ? new Date() : null;

    const client = await prisma.client.create({
      data: {
        nome: capitalizeText(nome),
        email: contact.email,
        telefone: contact.telefone,
        telefone_digits: contact.phoneDigits || null,
        cidade: address.cidade,
        origem: partnerId ? "INDICACAO" : "FORMULARIO",
        status: "LEAD",
        observacoes,
        company_id: companyId,
        tipo_pessoa: tipoPessoa,
        cpf,
        cnpj,
        cep: cepFormatted,
        endereco: address.endereco || null,
        numero: truncateField(data.numero || "", FORM_FIELD_LIMITS.numero) || null,
        bairro: address.bairro || null,
        uf: address.uf,
        tipo_imovel: data.tipo_imovel?.trim() || null,
        lgpd_aceite: true,
        lgpd_aceite_em: new Date(),
        marketing_aceite: Boolean(data.marketing_aceite),
        partner_id: partnerId,
        partner_attributed_at: attributedAt,
      },
    });

    revalidatePath("/clientes");
    revalidatePath("/marketing/formularios");
    if (partnerId) {
      revalidatePath("/parceiro/clientes");
    }

    void sendSignupConfirmationEmail({
      companyId,
      kind: "cliente",
      nome: client.nome,
      email: client.email,
    });

    return { success: true, id: client.id };
  } catch (error) {
    console.error("Erro no cadastro público de cliente:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível enviar o cadastro.",
    };
  }
}
