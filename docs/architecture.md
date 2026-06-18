# Arquitetura do Projeto - Móveis Unghero

Este documento descreve a infraestrutura técnica e escolhas arquiteturais para a modernização do site Móveis Unghero.

## 1. Escolha Tecnológica

- **Framework**: [Next.js (App Router)](https://nextjs.org/) na versão mais recente, aproveitando componentes de servidor (React Server Components) para tempo de carregamento instantâneo.
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/) para tipagem estática e maior manutenibilidade.
- **Estilização**: **Vanilla CSS** através de **CSS Modules** nativos. Isso garante:
  - Zero overhead de bibliotecas de terceiros (máxima performance no Google PageSpeed/LCP).
  - Isolamento de escopo por componente para evitar conflitos de estilo.
  - Controle completo sobre animações e responsividade.

## 2. Estrutura de Conteúdo Desacoplada (Headless Local)

Em vez de usar um banco de dados complexo ou um CMS pesado (como o WordPress antigo), o site armazena seu conteúdo em arquivos Markdown localizados no diretório `/content/`:
- `/content/ambientes/`: Contém informações de Cozinhas, Closets, Banheiros e Dormitórios.
- `/content/cidades/`: Focado em SEO local (Farroupilha, Caxias do Sul, etc.).
- `/content/blog/`: Conteúdos educativos sobre design e decoração.

Uma biblioteca utilitária simples (`gray-matter`) é usada para parsear esses arquivos sob demanda ou estaticamente no build do Next.js.

## 3. SEO Técnico e Otimização para LLMs

A arquitetura foi planejada para responder perfeitamente a dois tipos de usuários: **Humanos** e **Modelos de Linguagem (LLMs)**.

- **Humanos**:
  - CSS Modules para layout fluido e interações leves.
  - Marcação HTML5 semântica estruturada.
  - Chamadas para ação claras (conversão focada em WhatsApp).

- **LLMs**:
  - Arquivo `/llms.txt` contendo informações estruturadas em Markdown simples.
  - Endpoint dinâmico `/llms/` que junta todo o conteúdo legível do site.
  - Schemas JSON-LD completos em `/schemas/` injetados diretamente nas páginas.
