"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/utils";
import { normalizeAddressFields } from "@/lib/address";
import type { TipoPessoa } from "@/lib/clientDocument";
import { findExistingClient, resolveClientContactFields } from "@/lib/clientMatch";
import { stripConsentFromObservacoes } from "@/lib/clientConsent";
import { isValidBrPhoneDigits } from "@/lib/phone";
import { resolvePublicCompanyId } from "@/lib/publicCompany";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import { resolvePartnerByInviteCode } from "@/lib/partnerInvite";
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

    const nome = data.nome?.trim();
    const telefone = data.telefone?.trim();

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
    const documentoDigits = data.documento?.replace(/\D/g, "") || "";
    const cpf = tipoPessoa === "PF" ? documentoDigits || null : null;
    const cnpj = tipoPessoa === "PJ" ? documentoDigits || null : null;

    const existing = await findExistingClient({
      companyId,
      telefone,
      email: data.email,
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

    const contact = resolveClientContactFields(telefone, data.email);
    const observacoes = stripConsentFromObservacoes(data.observacoes?.trim() || "");

    const address = normalizeAddressFields({
      cidade: data.cidade,
      bairro: data.bairro,
      uf: data.uf,
      endereco: data.endereco,
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
        cep: data.cep?.trim() || null,
        endereco: address.endereco || null,
        numero: data.numero?.trim() || null,
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

    return { success: true, id: client.id };
  } catch (error) {
    console.error("Erro no cadastro público de cliente:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível enviar o cadastro.",
    };
  }
}
