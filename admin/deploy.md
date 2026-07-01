# Manual de Deploy em Produção — Móveis Unghero SaaS Admin

Este manual técnico descreve o processo passo a passo para realizar a implantação (deploy) do SaaS Admin na nuvem utilizando o **Cloudflare Pages**, banco de dados **Neon PostgreSQL** e autenticação **Better Auth**.

---

## 📋 Variáveis de Ambiente Necessárias (Production Secrets)

Antes de iniciar, você precisará coletar os seguintes valores e configurá-los como **Environment Variables** nas configurações de build do Cloudflare Pages:

| Variável | Descrição / Exemplo | Origem |
| :--- | :--- | :--- |
| `DATABASE_URL` | URL de conexão pooling segura com o PostgreSQL (ex: `postgresql://neondb_owner:***@ep-***.aws.neon.tech/neondb?sslmode=require`) | Neon Console |
| `BETTER_AUTH_SECRET` | Hash aleatório longo para encriptação de cookies de sessão (gerar com `openssl rand -hex 32`) | Gerado via CLI |
| `BETTER_AUTH_URL` | URL base pública de produção do seu painel admin (ex: `https://admin.moveisunghero.com.br` ou `https://unghero-admin.pages.dev`) | Cloudflare Pages URL |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Mesma URL pública descrita acima para carregamento no Client Component do browser | Cloudflare Pages URL |
| `CLOUDFLARE_R2_ACCESS_KEY` | Chave de acesso R2 para upload de arquivos de medições/renders | Cloudflare R2 |
| `CLOUDFLARE_R2_SECRET_KEY` | Chave secreta de autenticação R2 | Cloudflare R2 |
| `CLOUDFLARE_R2_BUCKET_NAME` | Nome do bucket R2 (ex: `unghero-media`) | Cloudflare R2 |

---

## ⚡ Passo 1: Configurar Banco de Dados no Neon PostgreSQL

1. Acesse o console do **Neon** (`https://neon.tech`) e crie um novo projeto chamado `Unghero-SaaS`.
2. Em **Connection String**, selecione a opção `Prisma` ou `PostgreSQL` e salve a URL gerada (esta será sua `DATABASE_URL`).
3. Para rodar as migrações iniciais e popular o banco de dados com a seed de demonstração a partir da sua máquina local:
   ```bash
   cd admin
   
   # Executa o push das tabelas para o banco Neon
   npx prisma db push
   
   # Popula o banco com dados iniciais realistas
   npx prisma db seed
   ```

---

## ⚙️ Passo 2: Configurar e Associar no Cloudflare Pages

### Método A: Deploy Contínuo (Git Integrado) - Recomendado

1. Acesse o **Cloudflare Dashboard** (`https://dash.cloudflare.com`).
2. Navegue até **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Selecione o repositório do projeto `Móveis Unghero` e escolha a branch principal (`main`).
4. **Configurações de Build:**
   * **Framework Preset:** Selecione `Next.js` ou deixe `None`.
   * **Build Command:** `npx @cloudflare/next-on-pages` (compilará o Next.js para Edge Worker).
   * **Build Output Directory:** `.vercel/output` (diretório padrão de saída do adapter).
   * **Root Directory:** `/admin` (indica para o Cloudflare compilar a subpasta onde está o painel Admin).
5. **Variáveis de Ambiente:**
   * Expanda a aba **Environment Variables** e adicione todas as variáveis listadas na tabela do início deste manual.
   * Certifique-se de configurar em **Settings** > **Functions** > **Compatibility flags** a flag `nodejs_compat` para a branch ativa (para habilitar suporte à biblioteca do Prisma no V8).
6. Clique em **Save and Deploy**. O Cloudflare Pages compilará e criará uma URL temporária (ex: `https://unghero-admin.pages.dev`).

---

### Método B: Deploy Manual via CLI (Wrangler)

Caso prefira publicar sem associar o GitHub diretamente, você pode implantar a partir da sua própria máquina usando o Wrangler CLI:

1. Faça o build do projeto Next-on-Pages na sua máquina:
   ```bash
   cd admin
   npx @cloudflare/next-on-pages
   ```
2. Realize o deploy da pasta compilada diretamente para o Cloudflare Pages:
   ```bash
   npx wrangler pages deploy .vercel/output --project-name=unghero-admin
   ```
3. O terminal fornecerá o link direto da publicação ativa em segundos.

---

## 🔒 Passo 3: Ativar o Google OAuth (Opcional para Better Auth)

Para que o login com o Google funcione em produção no painel admin:
1. Vá ao console de APIs do Google Cloud (`https://console.cloud.google.com`).
2. Crie uma credencial de **Client ID do OAuth 2.0**.
3. Adicione em **Origens JavaScript autorizadas** a URL de produção do seu admin (ex: `https://admin.moveisunghero.com.br`).
4. Adicione em **URIs de redirecionamento autorizados** a URL de callback do Better Auth:
   `https://admin.moveisunghero.com.br/api/auth/callback/google`
5. Salve as chaves obtidas e adicione as variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nas configurações do Cloudflare Pages.
