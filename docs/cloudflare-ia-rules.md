# Configuração do Cloudflare para Bots de IA

Muitos proprietários de sites ativam proteções de segurança automáticas que acabam bloqueando crawlers e assistentes de Inteligência Artificial sem perceber. Isso impede que o site apareça como resposta e citação no **ChatGPT Search**, **Gemini**, **Perplexity** e **Claude**.

Este guia detalha o passo a passo para garantir que a **Móveis Unghero** seja rastreável e legível por esses agentes no Cloudflare.

---

## 1. O Perigo da Opção Global "Block AI Scrapers"
O Cloudflare possui uma funcionalidade de um clique chamada **"Block AI Scrapers and Crawlers"** (Bloquear raspadores e rastreadores de IA). 

> [!WARNING]
> **Recomendação técnica:** **Não ative esta opção geral**.
> Ao ativá-la, o Cloudflare bloqueia indiscriminadamente *todos* os bots classificados como IA, incluindo robôs de busca legítimos (como o `OAI-SearchBot` do ChatGPT e o `PerplexityBot`), o que cortará o site de ser citado em respostas dessas ferramentas.

---

## 2. Passo a Passo: Criando Regra de Permissão (Bypass) no WAF
Para manter seu site seguro contra bots maliciosos (por exemplo, ativando a proteção contra ataques de força bruta ou crawlers de spam), mas ainda assim **permitir a leitura por IAs de busca**, o ideal é criar uma regra de **Bypass** específica.

Siga os passos no painel do Cloudflare:

1. Acesse o painel da sua conta e clique no seu domínio (**moveisunghero.com.br**).
2. No menu lateral esquerdo, vá em **Security** (Segurança) > **WAF** (Web Application Firewall).
3. Na aba **Custom Rules** (Regras Personalizadas), clique no botão **Create rule** (Criar regra).
4. Defina os seguintes campos:
   * **Rule name:** `Permitir Bots de IA e RAG`
   * **If incoming requests match...** (Se as requisições corresponderem a...):
     * Em **Field**, selecione **User Agent**.
     * Em **Operator**, selecione **contains** (contém).
     * Em **Value**, adicione cada um dos seguintes agentes (clique em **Or** para adicionar novas linhas):
       * `GPTBot` (OpenAI - ChatGPT)
       * `OAI-SearchBot` (OpenAI - ChatGPT Search)
       * `ChatGPT-User` (Ações diretas do usuário no ChatGPT)
       * `Google-Extended` (Google - Gemini)
       * `ClaudeBot` (Anthropic - Claude)
       * `Claude-Web` (Claude em tempo real)
       * `PerplexityBot` (Perplexity)
       * `CCBot` (Common Crawl)
       * `Amazonbot` (Amazon)
       * `cohere-ai` (Cohere)
       * `Meta-ExternalAgent` (Meta AI)
5. Na seção **Choose action** (Escolha a ação), selecione:
   * **Bypass** (Ignorar / Pular).
6. Na caixa **Bypass features**, marque as seguintes opções para garantir que o Cloudflare não barre os robôs em verificações secundárias:
   * **WAF managed rules** (Regras gerenciadas do WAF)
   * **Rate limiting** (Limitação de taxa)
   * **Super Bot Fight Mode** (Modo de combate a robôs)
   * **Security Level** (Nível de segurança)
7. Clique em **Deploy** (Implantar) no canto inferior direito.

---

## 3. Como Verificar Bloqueios Ativos
Se você notar que o tráfego de busca ou as respostas dos chats de IA pararam de citar o site, você pode auditar o log:

1. Vá em **Security** > **Events** (Eventos).
2. Filtre por **Service** (Serviço) igual a **WAF** ou **Super Bot Fight Mode**.
3. Procure por requisições bloqueadas que tenham no campo **User-Agent** algum dos robôs permitidos listados na seção 2 deste guia.
4. Se encontrar algum bloqueio, ajuste a sua regra de Bypass para cobrir o agente que foi barrado.

---

## 4. Configuração de Edge Cache de 24h para Bots de IA (Fase 9)
Para reduzir custos de processamento no servidor original do site e acelerar as requisições recorrentes de crawlers de busca inteligente, criaremos uma **Cache Rule** (Regra de Cache) no Cloudflare.

Isso garante que requisições idênticas vindas dessas IAs sejam respondidas diretamente na borda (Edge) do Cloudflare em poucos milissegundos, sem onerar sua hospedagem original.

### Passo a Passo no Painel do Cloudflare:
1. No menu lateral do Cloudflare, navegue até **Caching** > **Cache Rules** (Regras de Cache).
2. Clique no botão **Create rule** (Criar regra).
3. Preencha os campos da regra:
   * **Rule name:** `Edge Cache de 24h para Bots de IA`
   * **If incoming requests match...** (Se as requisições corresponderem a...):
     * Em **Field**, selecione **User Agent**.
     * Em **Operator**, selecione **contains** (contém).
     * Em **Value**, digite `GPTBot`.
     * Clique no botão **Or** (Ou) à direita.
     * Crie outra linha com **Field** = `User Agent`, **Operator** = `contains`, **Value** = `ClaudeBot`.
     * Clique no botão **Or** (Ou) à direita.
     * Crie mais uma linha com **Field** = `User Agent`, **Operator** = `contains`, **Value** = `PerplexityBot`.
     * *(Opcional: Você pode adicionar outros robôs de IA listados na seção 2 deste guia usando a mesma lógica).*
4. Em **Cache settings** (Configurações de Cache) logo abaixo:
   * Localize a opção **Edge cache TTL** (Tempo de vida do cache na borda).
   * Selecione **Eligible for cache** (Qualificado para cache) e configure a opção **Override origin** (Substituir origem) com o valor de **24 hours** (24 horas) ou **1 day**.
5. Clique em **Deploy** (Implantar) no canto inferior direito.
