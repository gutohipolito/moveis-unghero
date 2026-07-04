# Móveis Unghero

Monorepo com o site institucional e o painel administrativo da **Móveis Unghero** — marcenaria sob medida em Farroupilha-RS.

## Estrutura

| Pasta | Descrição | Stack |
|-------|-----------|-------|
| `/` (raiz) | Site institucional | Next.js 16, React 19, Markdown |
| `admin/` | Painel SaaS interno (CRM, fábrica, financeiro) | Next.js 16, Prisma, Neon, Better Auth |

## Site institucional

```bash
npm install
npm run dev      # http://localhost:3000
```

Conteúdo em `content/` (ambientes, cidades, projetos, blog). Deploy previsto na HostGator em `moveisunghero.com.br`.

## Painel Admin

```bash
cd admin
npm install
cp .env.example .env.local   # preencher variáveis
npx prisma db push
npx prisma db seed           # dados de demonstração (opcional)
npm run dev                  # http://localhost:3000
```

Deploy na Vercel com **Root Directory** = `admin`. Detalhes em [`admin/deploy.md`](admin/deploy.md).

### Variáveis de ambiente (admin)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Connection string do Neon PostgreSQL |
| `BETTER_AUTH_SECRET` | Sim (prod) | Secret para assinar sessões (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Sim (prod) | URL pública do admin (ex: `https://admin.moveisunghero.com.br`) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Sim (prod) | Mesma URL acima |
| `ADMIN_SETUP_SECRET` | Não | Secret para criar o primeiro admin via API |

### Primeiro acesso em produção

1. Configure as variáveis na Vercel (ver tabela acima).
2. Crie o administrador inicial:

```
GET /api/create-admin-prod?secret=SEU_SECRET&email=admin@moveisunghero.com.br&password=SUA_SENHA_FORTE
```

3. Acesse `/login` com as credenciais criadas.

> Login de demonstração (acesso rápido por perfil) funciona **apenas em localhost** durante o desenvolvimento.

## Documentação adicional

- [`docs/ai-strategy.md`](docs/ai-strategy.md) — Estratégia GEO para IAs
- [`docs/accessibility.md`](docs/accessibility.md) — Acessibilidade
- [`admin/deploy.md`](admin/deploy.md) — Deploy Vercel + DNS HostGator
