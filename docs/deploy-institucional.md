# Deploy do site institucional (Next raiz)

## Estado

O protótipo seletivo está pronto para build em produção na raiz do monorepo. O domínio `moveisunghero.com.br` ainda pode estar no site PHP/WordPress da HostGator até a troca de DNS/arquivos.

## Opção A — Vercel (recomendada)

1. Criar projeto Vercel com **Root Directory** = `.` (raiz), não `admin`.
2. Framework: Next.js. Build: `npm run build`. Output: padrão Next.
3. Domínios: `moveisunghero.com.br` e `www.moveisunghero.com.br`.
4. Manter o projeto do admin separado (Root = `admin`, domínio `admin.moveisunghero.com.br`).

## Opção B — HostGator com Node

1. Build local: `npm ci && npm run build`.
2. Enviar `.next`, `public`, `package.json`, `node_modules` (ou `npm ci --omit=dev` no servidor) e `content/`.
3. Process manager: `npm run start` na porta definida pelo painel.
4. Proxy reverso do domínio raiz para essa porta.

## Checklist pós-publicado

- [ ] Home carrega hero full-bleed e marca Unghero
- [ ] `/projetos` lista só cases integrais
- [ ] Redirects `/faq`, `/cidades/*`, `/ambientes/*` → rotas novas
- [ ] WhatsApp do contato inclui pergunta de escopo
- [ ] `https://moveisunghero.com.br/llms.txt` responde 200
- [ ] Proxies `/parceiro`, `/o`, `/r` intactos no HostGator
