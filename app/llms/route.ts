import { NextResponse } from 'next/server';
import { getAllMarkdownData } from '@/lib/markdown';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const ambientes = getAllMarkdownData('ambientes');
    const cidades = getAllMarkdownData('cidades');

    let responseText = `# Manifesto Móveis Unghero para LLMs\n\n`;
    responseText += `Este endpoint compila as principais informações de conteúdo técnico e local do site moveisunghero.com.br.\n\n`;

    responseText += `## 1. Ambientes Planejados\n\n`;
    ambientes.forEach((amb) => {
      responseText += `### ${amb.title}\n`;
      responseText += `**Descrição**: ${amb.description}\n\n`;
      responseText += `${amb.content}\n`;
      responseText += `\n---\n\n`;
    });

    responseText += `## 2. Cidades e Atendimento Local\n\n`;
    cidades.forEach((cid) => {
      responseText += `### ${cid.title}\n`;
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
