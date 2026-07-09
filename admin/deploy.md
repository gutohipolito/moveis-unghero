# Manual de Deploy em Produção — Móveis Unghero SaaS Admin

Este manual técnico orienta sobre a lentidão no ambiente de desenvolvimento local e fornece o passo a passo para hospedar o Painel Admin em produção na **Vercel** (plataforma oficial e otimizada para Next.js) vinculando o subdomínio `admin.moveisunghero.com.br` gerenciado na **HostGator**.

---

## ⚡ Por que o projeto está lento localmente?

No ambiente de desenvolvimento local (`npm run dev`), o Next.js compila as páginas **sob demanda** (On-Demand Compilation). Sempre que você acessa ou recarrega uma tela:
1. O compilador (Turbopack) analisa e constrói o código daquela página em tempo de execução.
2. A conexão ao banco de dados Neon PostgreSQL (remoto nos EUA) sofre com o delay de latência de rede TCP local da sua máquina.

### Em Produção:
Quando geramos a versão de produção (`npm run build` e hospedagem em nuvem):
* Todo o código JavaScript/TypeScript é compilado, minificado, otimizado e compactado previamente.
* As transições de rotas ocorrem de forma **instantânea** (carregamento em milissegundos).
* A latência de rede diminui drasticamente, pois a hospedagem possui conexões diretas e rápidas de borda (Edge Nodes) com servidores de banco de dados.

---

## 🚀 Por que usar a Vercel + DNS da HostGator?

A **HostGator compartilha servidores cPanel** comuns que **não possuem suporte estável e performático para Next.js** moderno (especialmente com Server Actions e Edge Runtime). O Next.js consome muita memória RAM durante o build, o que costuma travar hospedagens tradicionais.

**A Solução de Mercado:**
Você mantém o site institucional da Móveis Unghero hospedado normalmente na HostGator. Apenas criamos um subdomínio `admin` que aponta para a **Vercel** (que hospeda Next.js de graça, com certificados SSL automáticos e velocidade topo de linha global).

---

## 📋 Variáveis de Ambiente Necessárias (Production Secrets)

Durante a configuração do deploy na Vercel, você precisará adicionar as seguintes chaves de ambiente:

| Variável | Descrição / Exemplo | Origem |
| :--- | :--- | :--- |
| `DATABASE_URL` | URL de conexão segura com o Neon PostgreSQL (ex: `postgresql://neondb_owner:***@ep-***.aws.neon.tech/neondb?sslmode=require`) | Neon Console |
| `BETTER_AUTH_SECRET` | Uma hash aleatória longa para assinar as sessões de login. | Gerado via terminal |
| `BETTER_AUTH_URL` | URL de produção do seu admin: `https://admin.moveisunghero.com.br` | Domínio final |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Mesma URL pública descrita acima: `https://admin.moveisunghero.com.br` | Domínio final |
| `ADMIN_SETUP_SECRET` | Secret para criar o primeiro administrador via `/api/create-admin-prod` | Gerado via terminal |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Chave pública VAPID para push mobile (Web Push) | `npm run generate-vapid` |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID — **nunca commitar** | `npm run generate-vapid` |
| `VAPID_SUBJECT` | Contato do remetente push (ex: `mailto:contato@moveisunghero.com.br`) | E-mail da empresa |
| `CRON_SECRET` | Protege o cron de push (`/api/cron/push-notifications`) | `npm run generate-vapid` |

### Push mobile (opcional)

1. No diretório `admin`, gere as chaves:
   ```bash
   npm run generate-vapid
   ```
2. Copie as variáveis para `.env.local` (dev) e para **Settings → Environment Variables** na Vercel (produção).
3. O cron roda 1x por dia às 12:00 UTC / 9h BRT (`vercel.json`) e envia alertas para dispositivos inscritos. No plano Hobby da Vercel, cron só pode ser diário; para intervalos menores, use o plano Pro.
4. No iPhone: instale o painel na tela inicial (PWA) antes de ativar push no sino de notificações.

---

## 🛠️ Passo 1: Preparar o Banco de Dados (Neon PostgreSQL)

1. Acesse o console do **Neon** (`https://neon.tech`).
2. Vá nas configurações do seu banco e certifique-se de usar a connection string pooling.
3. Se quiser rodar a estrutura do banco e injetar os dados de demonstração iniciais:
   ```bash
   cd admin
   npx prisma db push
   npx prisma db seed
   ```

---

## 📦 Passo 2: Deploy na Vercel (Conexão com GitHub)

1. Acesse o site da **Vercel** (`https://vercel.com`) e crie uma conta gratuita (pode vincular com seu GitHub).
2. Clique em **Add New...** > **Project**.
3. Importe o repositório do GitHub onde está o código da `Móveis Unghero`.
4. **Configurações do Projeto:**
   * **Framework Preset:** Selecione `Next.js`.
   * **Root Directory:** Edite e selecione a pasta `admin` (pois o projeto é uma subpasta da raíz).
5. **Variáveis de Ambiente (Environment Variables):**
   * Expanda a seção e adicione as 4 variáveis listadas na tabela do início deste manual.
   * *Dica:* Para gerar uma chave segura para `BETTER_AUTH_SECRET`, você pode rodar o comando `openssl rand -hex 32` no seu terminal ou usar qualquer gerador online de hashes seguras.
6. Clique em **Deploy**. O build completará em cerca de 1 a 2 minutos.

---

## 🌐 Passo 3: Apontar o subdomínio `admin` no DNS da HostGator

Para fazer o endereço `admin.moveisunghero.com.br` abrir o painel da Vercel:

1. Acesse o painel da **HostGator** (Portal do Cliente) e entre no **cPanel** do seu domínio `moveisunghero.com.br`.
2. No campo de busca do cPanel, digite **Zone Editor** (Editor de Zona DNS).
3. Ao lado do seu domínio `moveisunghero.com.br`, clique em **Gerenciar**.
4. Clique no botão **Adicionar Registro** (Add Record). Preencha as informações:
   * **Nome (Name):** `admin` (ou `admin.moveisunghero.com.br.`)
   * **TTL:** `14400` ou deixe o padrão
   * **Tipo (Type):** Selecione **CNAME**
   * **Registro (Record/Value):** `cname.vercel-dns.com`
5. Clique em **Adicionar Registro** (Salvar).

---

## 🔗 Passo 4: Conectar o Domínio na Vercel

1. No dashboard do seu projeto na **Vercel**, vá em **Settings** > **Domains**.
2. No campo de texto, digite: `admin.moveisunghero.com.br` e clique em **Add**.
3. A Vercel detectará o apontamento DNS feito na HostGator e emitirá um certificado SSL de segurança HTTPS de forma automática em poucos minutos.

Pronto! A partir desse momento, qualquer alteração que você fizer no código local e enviar ao GitHub (`git push`) gerará um build de produção automático na Vercel e atualizará o site em tempo real sem nenhuma lentidão de desenvolvimento!

---

## 🔐 Primeiro acesso (criar administrador)

Após o deploy, crie o usuário administrador inicial acessando (substitua os valores):

```
https://admin.moveisunghero.com.br/api/create-admin-prod?secret=SEU_ADMIN_SETUP_SECRET&email=admin@moveisunghero.com.br&password=SUA_SENHA_FORTE
```

Em seguida, acesse `/login` com as credenciais criadas. O login de demonstração (acesso rápido por perfil) funciona apenas em `localhost` durante o desenvolvimento.
