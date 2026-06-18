import { NextResponse } from 'next/server';
import { getAmbienteCategories, getMarkdownData, getSubcategories, getAllMarkdownData } from '@/lib/markdown';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const categorias = getAmbienteCategories();
    const cidades = getAllMarkdownData('cidades');

    let responseText = `# Manifesto Móveis Unghero para LLMs\n\n`;
    responseText += `Este endpoint compila as principais informações de conteúdo técnico e local do site moveisunghero.com.br.\n\n`;

    responseText += `## 1. Ambientes Planejados (Topic Clusters)\n\n`;
    responseText += `Estrutura de Marcenaria sob Medida residencial, de lazer e corporativa comercial.\n\n`;

    categorias.forEach((cat) => {
      const pilar = getMarkdownData(`ambientes/${cat}`, 'index');
      if (pilar) {
        responseText += `### [Pilar] ${pilar.title}\n`;
        responseText += `**Descrição**: ${pilar.description}\n\n`;
        responseText += `${pilar.content}\n\n`;

        // Busca e concatena os spokes (satélites) desta categoria
        const subs = getSubcategories(cat);
        if (subs.length > 0) {
          responseText += `#### Subcategorias de ${pilar.title}:\n\n`;
          subs.forEach((sub) => {
            responseText += `##### ${sub.title}\n`;
            responseText += `**Descrição específica**: ${sub.description}\n\n`;
            responseText += `${sub.content}\n\n`;
          });
        }
        responseText += `\n---\n\n`;
      }
    });

    responseText += `## 2. Cidades e Atendimento Local (GEO)\n\n`;
    cidades.forEach((cid) => {
      responseText += `### Atendimento em ${cid.city || cid.title}\n`;
      responseText += `**Descrição**: ${cid.description}\n\n`;
      responseText += `${cid.content}\n`;
      responseText += `\n---\n\n`;
    });

    return new NextResponse(responseText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=18000',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar llms.txt dinâmico:', error);
    return new NextResponse('Erro interno ao processar o manifesto de LLM.', { status: 500 });
  }
}
