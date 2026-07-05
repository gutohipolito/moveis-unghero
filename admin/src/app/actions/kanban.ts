"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Tipo de Status do Projeto conforme o Schema do Prisma
export type ProjectStatus = 
  | "LEAD"
  | "ORCAMENTO"
  | "NEGOCIACAO"
  | "CONFERENCIA_TECNICA"
  | "APROVADO"
  | "PRODUCAO"
  | "INSTALACAO"
  | "FINALIZADO";

// Tipo de Origem do Lead
export type Origin = 
  | "SITE"
  | "INSTAGRAM"
  | "INDICACAO"
  | "GOOGLE"
  | "WHATSAPP"
  | "FACEBOOK";

// Server Action para atualizar o status de um projeto no Kanban
export async function updateProjectStatus(projectId: string, newStatus: ProjectStatus) {
  try {
    // Tenta atualizar no banco de dados real
    await prisma.project.update({
      where: { id: projectId },
      data: { status_geral: newStatus }
    });
    
    revalidatePath("/crm");
    return { success: true };
  } catch (error) {
    console.warn("Falha ao atualizar status no banco (usando modo simulação):", error);
    // Modo simulação para quando o banco real não está rodando localmente
    return { success: true, simulated: true };
  }
}

// Server Action para criar um novo Lead (Cliente + Projeto Inicial)
export async function createLead(formData: {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: Origin;
  valor_previsto: number;
  company_id: string;
  client_id?: string; // Opcional, para associar a cliente já cadastrado
  status_geral?: ProjectStatus; // Opcional, status inicial
  tipo_pessoa?: "PF" | "PJ";
  cpf?: string;
  cnpj?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  uf?: string;
  tipo_imovel?: string;
  obs_imovel?: string;
  obs_entrega?: string;
}) {
  try {
    const statusInicial = formData.status_geral || "LEAD";
    
    // Tenta gravar no banco real
    const result = await prisma.$transaction(async (tx) => {
      let client;

      if (formData.client_id) {
        // Busca o cliente existente
        client = await tx.client.findFirstOrThrow({
          where: { id: formData.client_id }
        });
      } else {
        // Cria um novo cliente
        client = await tx.client.create({
          data: {
            nome: formData.nome,
            email: formData.email,
            telefone: formData.telefone,
            cidade: formData.cidade,
            origem: formData.origem,
            status: statusInicial,
            company_id: formData.company_id,
            tipo_pessoa: formData.tipo_pessoa || "PF",
            cpf: formData.tipo_pessoa === "PJ" ? null : formData.cpf || null,
            cnpj: formData.tipo_pessoa === "PJ" ? formData.cnpj || null : null,
            cep: formData.cep || null,
            endereco: formData.endereco || null,
            numero: formData.numero || null,
            bairro: formData.bairro || null,
            uf: formData.uf || null,
            tipo_imovel: formData.tipo_imovel || null,
            obs_imovel: formData.obs_imovel || null,
            obs_entrega: formData.obs_entrega || null,
          }
        });
      }

      const project = await tx.project.create({
        data: {
          client_id: client.id,
          valor_previsto: formData.valor_previsto,
          status_geral: statusInicial,
        }
      });

      // Cria a timeline inicial
      await tx.timeline.create({
        data: {
          project_id: project.id,
          acao: "Lead criado no sistema",
          interno_sotamente: false,
          user_id: "system-admin-mock-id", // mock id
        }
      });

      return { client, project };
    });

    revalidatePath("/crm");
    return { success: true, data: result };
  } catch (error) {
    console.warn("Falha ao criar lead no banco (usando modo simulação):", error);
    // Retorna simulação de sucesso para testes locais sem banco
    return { 
      success: true, 
      simulated: true,
      data: {
        client: { id: "simulated-client-id", ...formData },
        project: { id: "simulated-project-id", client_id: "simulated-client-id", valor_previsto: formData.valor_previsto, status_geral: formData.status_geral || "LEAD" }
      }
    };
  }
}

// Server Action para editar um projeto/card no Kanban
export async function updateProjectAction(
  projectId: string,
  data: {
    valor_previsto: number;
    status_geral: ProjectStatus;
    nome: string;
    telefone: string;
    cidade: string;
    origem: Origin;
    tipo_pessoa?: "PF" | "PJ";
    cpf?: string;
    cnpj?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    uf?: string;
    tipo_imovel?: string;
    obs_imovel?: string;
    obs_entrega?: string;
  }
) {
  try {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        valor_previsto: data.valor_previsto,
        status_geral: data.status_geral,
        client: {
          update: {
            nome: data.nome,
            telefone: data.telefone,
            cidade: data.cidade,
            origem: data.origem,
            tipo_pessoa: data.tipo_pessoa,
            cpf: data.cpf !== undefined ? data.cpf : undefined,
            cnpj: data.cnpj !== undefined ? data.cnpj : undefined,
            cep: data.cep !== undefined ? data.cep : undefined,
            endereco: data.endereco !== undefined ? data.endereco : undefined,
            numero: data.numero !== undefined ? data.numero : undefined,
            bairro: data.bairro !== undefined ? data.bairro : undefined,
            uf: data.uf !== undefined ? data.uf : undefined,
            tipo_imovel: data.tipo_imovel !== undefined ? data.tipo_imovel : undefined,
            obs_imovel: data.obs_imovel !== undefined ? data.obs_imovel : undefined,
            obs_entrega: data.obs_entrega !== undefined ? data.obs_entrega : undefined,
          }
        }
      },
      include: {
        client: true
      }
    });

    revalidatePath("/crm");
    return { success: true, project };
  } catch (error) {
    console.warn("Falha ao editar projeto no banco (usando modo simulação):", error);
    return { success: true, simulated: true };
  }
}

