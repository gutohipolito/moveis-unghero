"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface BriefingSubmitData {
  nome: string;
  telefone: string;
  email?: string;
  cidade: string;
  bairro?: string;
  origem_lead: string;
  
  ambientes: { nome: string; opcao?: string }[];
  tipo_imovel: string;
  fase_projeto: string;
  pronto: string;
  data_chaves?: string;
  tem_projeto: string;
  estilo: string;
  faixa_investimento: string;
  prazo_inicio: string;
  pinterest_link?: string;
  referencia_url?: string;
  observacoes_adicionais?: string;
  
  // Metadados ocultos
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  gclid?: string;
  fbclid?: string;
  ip?: string;
  user_agent?: string;
  dispositivo?: string;
  os?: string;
  resolution?: string;
  idioma?: string;
  tempo_preenchimento?: number;
  company_id?: string;
}

export async function submitPublicBriefingAction(data: BriefingSubmitData) {
  try {
    // 1. Resolver a empresa (Company)
    let companyId = data.company_id;
    if (!companyId) {
      const firstCompany = await prisma.company.findFirst();
      if (!firstCompany) {
        return { success: false, error: "Nenhuma empresa cadastrada no sistema." };
      }
      companyId = firstCompany.id;
    }

    // 2. Resolver o usuário comercial para a timeline
    const commercialUser = await prisma.user.findFirst({
      where: { company_id: companyId }
    });
    if (!commercialUser) {
      return { success: false, error: "Nenhum usuário comercial disponível para receber o lead." };
    }

    // 3. Criar ou atualizar o Cliente
    const cleanEmail = (data.email || "").trim().toLowerCase();
    const cleanTelefone = data.telefone.trim();

    let client = await prisma.client.findFirst({
      where: {
        company_id: companyId,
        OR: [
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
          { telefone: cleanTelefone }
        ]
      }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          nome: data.nome.trim(),
          email: cleanEmail || `${cleanTelefone.replace(/\D/g, "")}@unghero.com.br`,
          telefone: cleanTelefone,
          cidade: data.cidade.trim(),
          bairro: data.bairro?.trim() || null,
          tipo_imovel: data.tipo_imovel || null,
          origem: "FORMULARIO",
          status: "LEAD",
          company_id: companyId,
        }
      });
    } else {
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          origem: "FORMULARIO",
          ...(data.bairro?.trim() && !client.bairro ? { bairro: data.bairro.trim() } : {}),
          ...(client.cidade.includes(" - ") || client.cidade.includes(" – ")
            ? { cidade: data.cidade.trim() }
            : {}),
        },
      });
    }

    // 4. Calcular o valor previsto baseado na faixa de investimento
    let valorPrevisto = 0;
    if (data.faixa_investimento === "Até R$15 mil") valorPrevisto = 12000;
    else if (data.faixa_investimento === "R$15 mil a R$30 mil") valorPrevisto = 22000;
    else if (data.faixa_investimento === "R$30 mil a R$60 mil") valorPrevisto = 45000;
    else if (data.faixa_investimento === "Acima de R$60 mil") valorPrevisto = 85000;
    else valorPrevisto = 0; // Prefiro conversar

    // 5. Calcular Lead Score
    let score = 0;
    if (data.tem_projeto === "Sim") score += 30;
    if (data.prazo_inicio === "Este mês") score += 30;
    if (data.faixa_investimento === "R$30 mil a R$60 mil" || data.faixa_investimento === "Acima de R$60 mil") score += 25;
    
    const hasFullProject = data.ambientes.some(
      a => a.nome === "Apartamento completo" || a.nome === "Casa completa"
    );
    if (hasFullProject) score += 20;
    
    if (data.fase_projeto === "Comparando orçamentos") score += 10;
    if (data.fase_projeto === "Apenas pesquisando") score -= 20;
    if (data.prazo_inicio === "Mais de 6 meses") score -= 15;

    // Classificação
    let classificacao = "Morna";
    if (score >= 80) classificacao = "Quente";
    else if (score < 50) classificacao = "Fria";

    // 6. Gerar Roteiro Personalizado de Venda em Markdown
    let roteiro = `### 📋 Script de Abordagem Personalizado

Fale com o cliente focando nestes pontos baseados nas respostas dele:

`;

    if (data.tem_projeto === "Sim") {
      roteiro += `* **Cliente possui projeto de interiores pronto**: Foco 100% técnico e comercial rápido. Solicite o arquivo PDF ou dwg para o cálculo preciso do orçamento. Evite perder tempo tentando criar um design do zero.\n`;
    } else if (data.tem_projeto === "Preciso que seja feito um") {
      roteiro += `* **Necessita de projeto de interiores**: Use o nosso grande diferencial! Enfatize que *desenvolvemos o projeto simples em 3D de visualização sem custo adicional*. Agende uma conversa para entender o estilo e cores preferidos.\n`;
    } else {
      roteiro += `* **Não possui projeto**: Ofereça nossa consultoria de ambientação. Mostre referências de móveis que combinam com o estilo **${data.estilo}** que ele escolheu.\n`;
    }

    if (data.prazo_inicio === "Este mês") {
      roteiro += `* **URGÊNCIA MÁXIMA**: O cliente pretende iniciar as obras **este mês**. Envie uma mensagem de WhatsApp imediatamente. Foco em agendar uma reunião comercial nos próximos 2 dias.\n`;
    } else if (data.prazo_inicio === "Mais de 6 meses") {
      roteiro += `* **Planejamento de Longo Prazo**: O cliente pretende iniciar a fabricação em mais de 6 meses. Não pressione por fechamento imediato. Envie fotos de inspirações e adicione na régua de contatos mensais.\n`;
    }

    if (data.faixa_investimento === "Acima de R$60 mil" || data.faixa_investimento === "R$30 mil a R$60 mil") {
      roteiro += `* **ALTO POTENCIAL DE INVESTIMENTO (${data.faixa_investimento})**: Cliente com orçamento qualificado. Valorize nossos acabamentos em laca, vidros reflecta, sistemas de alinhamento LED embutidos e ferragens com amortecimento de alto padrão.\n`;
    }

    if (data.tipo_imovel === "Apartamento") {
      roteiro += `* **Atenção a condomínios**: Imóvel é um Apartamento. Pergunte sobre restrições de horários de barulho e entrega de materiais do prédio.\n`;
    }

    // 7. Criar Projeto
    const statusInicial = "LEAD";
    const project = await prisma.project.create({
      data: {
        client_id: client.id,
        valor_previsto: 0,
        status_geral: statusInicial,
        ultimo_contato_em: new Date(),
        observacoes: data.observacoes_adicionais || null
      }
    });

    // 9. Salvar Briefing Qualificado
    await prisma.leadBriefing.create({
      data: {
        project_id: project.id,
        ambientes: JSON.stringify(data.ambientes),
        tipo_imovel: data.tipo_imovel,
        fase_projeto: data.fase_projeto,
        pronto: data.pronto,
        data_chaves: data.data_chaves || null,
        tem_projeto: data.tem_projeto,
        estilo: data.estilo,
        faixa_investimento: data.faixa_investimento || null,
        prazo_inicio: data.prazo_inicio,
        pinterest_link: data.pinterest_link || null,
        referencia_url: data.referencia_url || null,
        origem_lead: data.origem_lead,
        
        // Metadados
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        gclid: data.gclid || null,
        fbclid: data.fbclid || null,
        ip: data.ip || null,
        user_agent: data.user_agent || null,
        dispositivo: data.dispositivo || null,
        os: data.os || null,
        resolution: data.resolution || null,
        idioma: data.idioma || null,
        tempo_preenchimento: data.tempo_preenchimento || null,
        
        score: score,
        roteiro_sugerido: roteiro
      }
    });

    // 10. Gravar na Timeline
    await prisma.timeline.create({
      data: {
        project_id: project.id,
        acao: `Briefing de Qualificação preenchido pelo cliente. Score: ${score} (Classificação: ${classificacao})`,
        interno_sotamente: false,
        user_id: commercialUser.id
      }
    });

    // 11. Criar Lembretes para os admins/operadores (+1 dia útil)
    const companyUsers = await prisma.user.findMany({
      where: { company_id: companyId }
    });

    const addOneBusinessDay = (date: Date): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + 1);
      while (result.getDay() === 0 || result.getDay() === 6) {
        result.setDate(result.getDate() + 1);
      }
      return result;
    };

    const dueAt = addOneBusinessDay(new Date());

    if (companyUsers.length > 0) {
      await prisma.operatorReminder.createMany({
        data: companyUsers.map((u) => ({
          user_id: u.id,
          company_id: companyId,
          title: `Solicitação de Orçamento: ${data.nome.trim()}`,
          due_at: dueAt
        }))
      });
    }

    revalidatePath("/crm");
    revalidatePath("/clientes");
    
    return { success: true, projectId: project.id, score, classification: classificacao };
  } catch (error) {
    console.error("Erro ao salvar briefing de qualificação:", error);
    return { success: false, error: "Ocorreu um erro interno ao processar suas informações." };
  }
}
