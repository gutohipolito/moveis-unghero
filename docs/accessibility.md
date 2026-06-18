# Diretrizes de Acessibilidade (a11y) - Móveis Unghero

Garantir que o site da Móveis Unghero seja acessível para todos os usuários é um pilar de nossa estratégia de marca ("Feito com Afeto") e de SEO.

## 1. Semântica HTML5

- Todo elemento deve ter o seu papel semântico respeitado.
- Uso correto de tags estruturais: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`.
- Hierarquia estrita de títulos: apenas um único `<h1>` por página, seguido de `<h2>`, `<h3>` etc., sem pular níveis.
- Botões interativos devem ser elementos `<button>` (ou links `<a>` se navegarem para outra URL), nunca `<div>` com manipuladores de clique genéricos.

## 2. Cores e Contraste

- Relação de contraste de cores mínima de **4.5:1** para texto normal e **3:1** para texto grande (seguindo os padrões WCAG AA).
- A cor principal de destaque (`#FAB207` - Dourado) deve ser combinada com fundos muito escuros (como cinza chumbo `#18191b` ou preto `#0b0b0b`) para garantir legibilidade máxima.
- Links e elementos interativos devem ter estados de foco (`:focus-visible`) visíveis e destacados (ex: contorno dourado de 2px).

## 3. Navegação por Teclado e Leitores de Tela

- Elementos interativos devem ser navegáveis via tecla `TAB`.
- Imagens informativas devem conter o atributo `alt` descritivo. Imagens puramente decorativas devem ter `alt=""` para que os leitores de tela as ignorem.
- O uso de tags ARIA (`aria-expanded`, `aria-hidden`, `aria-label`) é obrigatório em componentes dinâmicos (como o menu mobile colapsável e accordions de FAQ).
- Os formulários e campos de entrada devem ter rótulos `<label>` explicitamente associados via atributo `htmlFor` (ou `for`).
