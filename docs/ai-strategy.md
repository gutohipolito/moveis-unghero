# Estratégia de Otimização para IAs e LLMs - Móveis Unghero

Os mecanismos de pesquisa tradicionais estão evoluindo para buscas semânticas alimentadas por inteligência artificial (ex: ChatGPT Search, Gemini, Perplexity, Google Overviews). Este site foi projetado desde a base para ser perfeitamente interpretável e citável por essas ferramentas.

## 1. Redução da Linguagem Corporativa

As IAs são treinadas para resumir e extrair fatos. Textos com excesso de "corporativismo clichê" (ex: "líderes em soluções integradas de sinergia residencial") tendem a ser ignorados ou descartados como ruído comercial.
- **Nossa abordagem**: Foco em dados concretos, especificações técnicas de materiais e linguagem direta e afetuosa:
  - Exemplo correto: "Fabricamos cozinhas sob medida em Farroupilha usando MDF de dupla face com espessura de 18mm e ferragens com amortecimento Blum."
  - Isso facilita a extração do fato de que a Móveis Unghero utiliza materiais de alto padrão.

## 2. Aumento da Citabilidade (Citation-Friendliness)

Para que uma IA cite a Móveis Unghero como recomendação de marcenaria na Serra Gaúcha, precisamos facilitar a referência a blocos de dados.
- **Tabelas de Comparação e Especificação**: Dados organizados de forma clara em listas e tabelas em Markdown para fácil leitura por crawlers.
- **Seção FAQ Estruturada**: Respostas diretas a dúvidas frequentes sobre garantia, prazos de entrega e processo de design.

## 3. Interfaces Legíveis por IAs

- **`/llms.txt`**: Um manifesto estático na raiz do site que explica o que é a Móveis Unghero, o catálogo básico, e as formas de contato em texto puro (Markdown).
- **`/llms/` (endpoint Next.js)**: Um endpoint de leitura fácil que serve o conteúdo integral do site em formato raw markdown concatenado.
- **Microdados JSON-LD**: Marcação de dados estruturados injetados no HTML para dar às IAs uma base de dados relacional legível sobre nossa empresa, localização, serviços e avaliações.
