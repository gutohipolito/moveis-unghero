# Móveis Unghero

Monorepo com o **site institucional seletivo** e o painel administrativo.

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| `/` (raiz) | Site institucional (Next.js) — foto-led, projetos integrais |
| `admin/` | CRM / fábrica / portal parceiro → `admin.moveisunghero.com.br` |

## Site institucional

```bash
npm install
npm run dev      # http://localhost:3000
```

Rotas: `/` · `/projetos` · `/processo` · `/sobre` · `/contato`

Conteúdo de cases em `content/projetos/`. Briefing de fotos em `content/briefing-ensaio-fotografico.md`. Conteúdo SEO antigo em `content/_archive/`.

### Deploy (domínio institucional)

O site vivo hoje ainda é o HostGator clássico. Para publicar **este** Next no `moveisunghero.com.br`:

1. `npm run build && npm run start` (Node na HostGator) **ou** conectar a pasta raiz a um projeto Vercel e apontar o DNS do domínio raiz / www.
2. Manter `admin.moveisunghero.com.br` no projeto Vercel com Root Directory = `admin`.
3. Proxies HostGator (`/o`, `/r`, `/parceiro`, etc.) continuam no `public_html` apontando para o admin.

Build de verificação:

```bash
npm run build
```

## Painel Admin

Ver [`admin/deploy.md`](admin/deploy.md).
