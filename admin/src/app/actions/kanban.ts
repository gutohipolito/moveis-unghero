"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  assertCompanyAccess,
  getAuthContext,
  requireClientInCompany,
  requireProjectInCompany,
} from "@/lib/auth-guard";
import { findExistingClient, resolveClientContactFields } from "@/lib/clientMatch";

export type ProjectStatus =
  | "LEAD"
  | "ORCAMENTO"
  | "NEGOCIACAO"
  | "CONFERENCIA_TECNICA"
  | "APROVADO"
  | "PRODUCAO"
  | "INSTALACAO"
  | "FINALIZADO"
  | "PERDIDO";

export type Origin =
  | "SITE"
  | "INSTAGRAM"
  | "INDICACAO"
  | "GOOGLE"
  | "WHATSAPP"
  | "FACEBOOK"
  | "FORMULARIO";

function revalidateCrmPaths() {
  revalidatePath("/crm");
}

export async function updateProjectStatus(projectId: string, newStatus: ProjectStatus) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const actorUserId = auth.userId;

    const currentProject = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { status_geral: true }
    });

    const oldStatus = currentProject.status_geral;

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          status_geral: newStatus,
          ...(newStatus === "PERDIDO" ? {} : { motivo_perda: null }),
        },
      });

      if (oldStatus !== newStatus) {
        await tx.timeline.create({
          data: {
            project_id: projectId,
            acao: `Etapa do funil alterada de ${oldStatus} para ${newStatus}`,
            interno_sotamente: false,
            user_id: actorUserId,
          },
        });
      }

      if (newStatus === "PRODUCAO") {
        const envCount = await tx.environment.count({
          where: { project_id: projectId },
        });
        if (envCount === 0) {
          await tx.environment.create({
            data: {
              project_id: projectId,
              nome: "Projeto Completo (Ambiente Padrão)",
              tipo: "OUTROS",
              status: "PRONTO_PRODUCAO",
            },
          });
        }
      }
    });

    revalidateCrmPaths();
    if (newStatus === "PRODUCAO" || newStatus === "INSTALACAO") {
      revalidatePath("/factory");
    }
    return { success: true };
  } catch (error) {
    console.warn("Falha ao atualizar status no banco:", error);
    return { success: false, error: "Não foi possível atualizar o status do projeto." };
  }
}

export async function markProjectContacted(projectId: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const actorUserId = auth.userId;

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { ultimo_contato_em: now },
      });

      await tx.timeline.create({
        data: {
          project_id: projectId,
          acao: `Contato de acompanhamento registrado pelo operador`,
          interno_sotamente: false,
          user_id: actorUserId,
        },
      });
    });

    revalidateCrmPaths();
    return { success: true, ultimo_contato_em: now.toISOString() };
  } catch (error) {
    console.warn("Falha ao registrar contato:", error);
    return { success: false, error: "Não foi possível registrar o contato.", ultimo_contato_em: null };
  }
}

export async function markProjectAsLost(projectId: string, motivo?: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const actorUserId = auth.userId;

    const motivoStr = motivo?.trim() || "";

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          status_geral: "PERDIDO",
          motivo_perda: motivoStr || null,
        },
      });

      await tx.timeline.create({
        data: {
          project_id: projectId,
          acao: `Negociação marcada como perdida.${motivoStr ? ` Motivo: ${motivoStr}` : ""}`,
          interno_sotamente: false,
          user_id: actorUserId,
        },
      });
    });

    revalidateCrmPaths();
    return { success: true };
  } catch (error) {
    console.warn("Falha ao marcar perda:", error);
    return { success: false, error: "Não foi possível atualizar o status do projeto." };
  }
}

export async function restoreProjectFromLoss(projectId: string, newStatus: ProjectStatus = "LEAD") {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const actorUserId = auth.userId;

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          status_geral: newStatus,
          motivo_perda: null,
          ultimo_contato_em: new Date(),
        },
      });

      await tx.timeline.create({
        data: {
          project_id: projectId,
          acao: `Negociação reativada a partir de perdas na etapa ${newStatus}`,
          interno_sotamente: false,
          user_id: actorUserId,
        },
      });
    });

    revalidateCrmPaths();
    return { success: true };
  } catch (error) {
    console.warn("Falha ao reativar lead:", error);
    return { success: false, error: "Não foi possível atualizar o status do projeto." };
  }
}

export async function createLead(formData: {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: Origin;
  valor_previsto: number;
  company_id: string;
  client_id?: string;
  status_geral?: ProjectStatus;
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
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    assertCompanyAccess(auth, formData.company_id);
    if (formData.client_id) {
      await requireClientInCompany(formData.client_id, auth.companyId);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const statusInicial = formData.status_geral || "LEAD";
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      let client;
      let linkedExistingClient = false;

      if (formData.client_id) {
        client = await tx.client.findFirstOrThrow({
          where: { id: formData.client_id },
        });
      } else {
        const existing = await findExistingClient({
          companyId: formData.company_id,
          telefone: formData.telefone,
          email: formData.email,
          cpf: formData.tipo_pessoa === "PJ" ? undefined : formData.cpf,
          cnpj: formData.tipo_pessoa === "PJ" ? formData.cnpj : undefined,
        });

        if (existing) {
          client = existing;
          linkedExistingClient = true;
        } else {
          const contact = resolveClientContactFields(formData.telefone, formData.email);
          client = await tx.client.create({
            data: {
              nome: formData.nome,
              email: formData.email,
              telefone: contact.telefone,
              telefone_digits: contact.phoneDigits || null,
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
            },
          });
        }
      }

      const project = await tx.project.create({
        data: {
          client_id: client.id,
          valor_previsto: formData.valor_previsto,
          status_geral: statusInicial,
          ultimo_contato_em: now,
        },
      });

      const actorUserId = auth.userId;

      await tx.timeline.create({
        data: {
          project_id: project.id,
          acao: linkedExistingClient
            ? "Nova solicitação vinculada ao cadastro existente"
            : "Lead criado no sistema",
          interno_sotamente: false,
          user_id: actorUserId,
        },
      });

      return { client, project };
    });

    revalidateCrmPaths();
    if (formData.client_id) {
      revalidatePath(`/clientes/${formData.client_id}`);
      revalidatePath("/clientes");
    }
    return { success: true, data: result };
  } catch (error) {
    console.warn("Falha ao criar lead no banco:", error);
    return { success: false, error: "Não foi possível criar o lead." };
  }
}

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
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        valor_previsto: data.valor_previsto,
        status_geral: data.status_geral,
        motivo_perda: data.status_geral === "PERDIDO" ? undefined : null,
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
          },
        },
      },
      include: {
        client: true,
      },
    });

    revalidateCrmPaths();
    return { success: true, project };
  } catch (error) {
    console.warn("Falha ao editar projeto no banco (usando modo simulação):", error);
    return { success: false, error: "Não foi possível atualizar o status do projeto." };
  }
}

export async function addProjectTimelineAction(projectId: string, text: string) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const actorUserId = auth.userId;

    const timelineItem = await prisma.timeline.create({
      data: {
        project_id: projectId,
        acao: text.trim(),
        interno_sotamente: false,
        user_id: actorUserId,
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    revalidateCrmPaths();
    return { 
      success: true, 
      timelineItem: {
        id: timelineItem.id,
        acao: timelineItem.acao,
        data: timelineItem.data.toISOString(),
        user: { name: timelineItem.user.name }
      }
    };
  } catch (error) {
    console.error("Erro ao adicionar histórico:", error);
    return { success: false, error: "Não foi possível registrar a anotação." };
  }
}

export async function updateProjectCommercialAction(
  projectId: string,
  data: {
    valor_previsto: number;
    status_geral: ProjectStatus;
    observacoes?: string;
  }
) {
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: "Não autenticado" };
  }
  try {
    await requireProjectInCompany(projectId, auth.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Acesso negado",
    };
  }

  try {
    const actorUserId = auth.userId;

    const currentProject = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { 
        status_geral: true,
        valor_previsto: true,
        observacoes: true
      }
    });

    const oldStatus = currentProject.status_geral;
    const oldValor = Number(currentProject.valor_previsto);
    const oldObs = currentProject.observacoes || "";

    const newValor = data.valor_previsto;
    const newStatus = data.status_geral;
    const newObs = data.observacoes || "";

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          valor_previsto: newValor,
          status_geral: newStatus,
          observacoes: newObs,
        },
      });

      if (oldStatus !== newStatus) {
        await tx.timeline.create({
          data: {
            project_id: projectId,
            acao: `Etapa do funil alterada de ${oldStatus} para ${newStatus}`,
            interno_sotamente: false,
            user_id: actorUserId,
          },
        });
      }

      if (oldValor !== newValor) {
        const formatBrl = (val: number) => 
          new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
        await tx.timeline.create({
          data: {
            project_id: projectId,
            acao: `Valor previsto alterado de ${formatBrl(oldValor)} para ${formatBrl(newValor)}`,
            interno_sotamente: false,
            user_id: actorUserId,
          },
        });
      }

      if (oldObs !== newObs) {
        await tx.timeline.create({
          data: {
            project_id: projectId,
            acao: `Observações da negociação atualizadas`,
            interno_sotamente: false,
            user_id: actorUserId,
          },
        });
      }

      if (newStatus === "PRODUCAO") {
        const envCount = await tx.environment.count({
          where: { project_id: projectId },
        });
        if (envCount === 0) {
          await tx.environment.create({
            data: {
              project_id: projectId,
              nome: "Projeto Completo (Ambiente Padrão)",
              tipo: "OUTROS",
              status: "PRONTO_PRODUCAO",
            },
          });
        }
      }
    });

    revalidateCrmPaths();
    if (newStatus === "PRODUCAO" || newStatus === "INSTALACAO") {
      revalidatePath("/factory");
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar projeto comercial:", error);
    return { success: false, error: "Não foi possível salvar as alterações comerciais." };
  }
}
