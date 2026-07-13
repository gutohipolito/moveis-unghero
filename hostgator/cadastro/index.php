<?php
/**
 * Formulário de cadastro de cliente servido diretamente em
 * moveisunghero.com.br/cadastro (sem redirecionar — a URL permanece).
 *
 * Os dados são enviados via API pública do painel:
 *   https://admin.moveisunghero.com.br/api/public/client-signup
 *
 * Upload via cPanel: public_html/cadastro/index.php
 */
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Cadastro de Cliente | Móveis Unghero</title>
  <link rel="icon" href="https://moveisunghero.com.br/favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <style>
    :root {
      --bg-main: #0c0d0f;
      --bg-card: #15171b;
      --bg-input: #1c1f24;
      --accent: #fab207;
      --accent-light: #ffc233;
      --text-main: #f5f5f7;
      --text-muted: #8e8e93;
      --border: #24282f;
      --danger: #f87171;
      --success: #34d399;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
      background: radial-gradient(1200px 600px at 50% -10%, #16181d 0%, var(--bg-main) 60%);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 24px 16px 48px;
    }
    h1, h2, .brand { font-family: "Outfit", sans-serif; }

    .topbar {
      max-width: 640px;
      width: 100%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text-main);
      font-weight: 800;
      letter-spacing: .14em;
      font-size: 15px;
      text-transform: uppercase;
    }
    .brand span { color: var(--accent); }

    .wrap { max-width: 640px; width: 100%; margin: 0 auto; }

    .progress-head {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 10px; font-weight: 800; letter-spacing: .18em;
      text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;
    }
    .progress-track { height: 6px; background: var(--bg-input); border-radius: 999px; overflow: hidden; }
    .progress-bar { height: 100%; width: 0%; background: linear-gradient(90deg, var(--accent), var(--accent-light)); border-radius: 999px; transition: width .35s ease; }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 26px 22px;
      margin-top: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,.45);
    }
    @media (min-width: 640px) { .card { padding: 34px; } }

    .step { animation: fade .3s ease; }
    @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .hidden { display: none !important; }

    .step-title { font-size: 20px; font-weight: 800; line-height: 1.2; }
    .step-sub { font-size: 12.5px; color: var(--text-muted); font-weight: 500; margin-top: 6px; margin-bottom: 22px; }

    .field { margin-bottom: 16px; }
    label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #d4d4d8; margin-bottom: 7px; }
    label .opt { color: var(--text-muted); font-weight: 600; }
    input, select, textarea {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border);
      color: var(--text-main);
      border-radius: 12px;
      padding: 13px 14px;
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    input::placeholder, textarea::placeholder { color: #55585f; font-weight: 500; }
    input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(250,178,7,.15); }
    textarea { resize: none; }
    select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238e8e93' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 13px center; padding-right: 38px; }
    .uppercase { text-transform: uppercase; }

    .grid { display: grid; gap: 14px; }
    @media (min-width: 560px) {
      .grid-2 { grid-template-columns: 1fr 1fr; }
      .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      .col-2 { grid-column: span 2; }
    }

    .type-grid { display: grid; gap: 12px; grid-template-columns: 1fr; margin-bottom: 20px; }
    @media (min-width: 560px) { .type-grid { grid-template-columns: 1fr 1fr; } }
    .type-btn {
      text-align: left; background: var(--bg-input); border: 1px solid var(--border);
      border-radius: 16px; padding: 16px; cursor: pointer; color: var(--text-main);
      display: flex; align-items: center; gap: 12px; transition: all .15s; font-family: inherit;
    }
    .type-btn:hover { border-color: #3a3f47; }
    .type-btn.active { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(250,178,7,.25); background: rgba(250,178,7,.06); }
    .type-btn .ico { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: rgba(250,178,7,.12); color: var(--accent); flex-shrink: 0; }
    .type-btn .t1 { font-size: 14px; font-weight: 800; }
    .type-btn .t2 { font-size: 11px; color: var(--text-muted); font-weight: 600; margin-top: 2px; }

    .actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 26px; }
    .actions.end { justify-content: flex-end; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      font-family: inherit; font-weight: 800; font-size: 13px; border-radius: 12px;
      padding: 13px 20px; cursor: pointer; border: 1px solid transparent; transition: all .15s;
    }
    .btn-primary { background: linear-gradient(90deg, var(--accent), var(--accent-light)); color: #1a1200; }
    .btn-primary:hover { filter: brightness(1.05); }
    .btn-ghost { background: transparent; border-color: var(--border); color: #cfcfd4; }
    .btn-ghost:hover { background: var(--bg-input); }
    .btn-submit { background: linear-gradient(90deg, var(--accent), var(--accent-light)); color: #1a1200; }
    .btn:disabled { opacity: .55; cursor: not-allowed; }

    .alert {
      display: flex; align-items: center; gap: 10px; background: rgba(248,113,113,.1);
      border: 1px solid rgba(248,113,113,.3); color: #fca5a5; font-size: 12.5px; font-weight: 700;
      border-radius: 12px; padding: 13px 14px; margin-bottom: 20px;
    }
    .alert svg { flex-shrink: 0; }

    .spinner { width: 15px; height: 15px; border: 2px solid rgba(26,18,0,.35); border-top-color: #1a1200; border-radius: 50%; animation: spin .7s linear infinite; }
    .spinner-muted { border-color: rgba(142,142,147,.4); border-top-color: var(--accent); }
    @keyframes spin { to { transform: rotate(360deg); } }

    .success { text-align: center; padding: 22px 6px; }
    .success .badge { width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 22px; background: rgba(52,211,153,.12); border: 1px solid rgba(52,211,153,.3); color: var(--success); }
    .success h2 { font-size: 22px; font-weight: 800; }
    .success p { color: var(--text-muted); font-size: 13px; font-weight: 500; max-width: 360px; margin: 12px auto 0; line-height: 1.6; }
    .channels { margin-top: 28px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 16px; padding: 18px; max-width: 340px; margin-left: auto; margin-right: auto; }
    .channels .lbl { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; font-weight: 800; color: #b8b8bd; }
    .channels-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
    .channel { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; text-decoration: none; color: #d4d4d8; font-size: 12px; font-weight: 700; transition: transform .15s; }
    .channel:hover { transform: translateY(-2px); }

    .footer { max-width: 640px; width: 100%; margin: 26px auto 0; text-align: center; color: #55585f; font-size: 11px; font-weight: 500; }
    .footer a { color: var(--text-muted); text-decoration: none; }
  </style>
</head>
<body>
  <div class="topbar">
    <a class="brand" href="https://moveisunghero.com.br">Móveis <span>Unghero</span></a>
  </div>

  <div class="wrap" id="form-wrap">
    <div class="progress-head">
      <span>Cadastro de Cliente</span>
      <span id="progress-label">0% Concluído</span>
    </div>
    <div class="progress-track"><div class="progress-bar" id="progress-bar"></div></div>

    <div class="card">
      <div class="alert hidden" id="alert">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span id="alert-msg"></span>
      </div>

      <!-- PASSO 1 -->
      <section class="step" id="step-1">
        <h2 class="step-title">Como é o seu cadastro?</h2>
        <p class="step-sub">Escolha pessoa física ou jurídica. Se for empresa, o CNPJ preenche seus dados.</p>

        <div class="type-grid">
          <button type="button" class="type-btn active" data-tipo="PF" id="btn-pf">
            <span class="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <span><span class="t1">Pessoa Física</span><span class="t2">PF — CPF</span></span>
          </button>
          <button type="button" class="type-btn" data-tipo="PJ" id="btn-pj">
            <span class="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            </span>
            <span><span class="t1">Pessoa Jurídica</span><span class="t2">PJ — CNPJ</span></span>
          </button>
        </div>

        <div class="field">
          <label id="doc-label">CPF <span class="opt">(Opcional)</span> <span id="doc-spinner" class="spinner spinner-muted hidden"></span></label>
          <input type="text" id="documento" placeholder="000.000.000-00" inputmode="numeric" />
        </div>

        <div class="actions end">
          <button type="button" class="btn btn-primary" data-next>Continuar
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </section>

      <!-- PASSO 2 -->
      <section class="step hidden" id="step-2">
        <h2 class="step-title">Seus dados de contato</h2>
        <p class="step-sub">Precisamos do nome e do WhatsApp para falar com você.</p>

        <div class="field">
          <label id="nome-label">Nome completo *</label>
          <input type="text" id="nome" placeholder="Ex: João da Silva" />
        </div>
        <div class="grid grid-2">
          <div class="field">
            <label>WhatsApp / Telefone *</label>
            <input type="tel" id="telefone" placeholder="(54) 99999-9999" inputmode="numeric" />
          </div>
          <div class="field">
            <label>E-mail <span class="opt">(Opcional)</span></label>
            <input type="email" id="email" placeholder="voce@exemplo.com" />
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-ghost" data-prev>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Voltar
          </button>
          <button type="button" class="btn btn-primary" data-next>Continuar
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </section>

      <!-- PASSO 3 -->
      <section class="step hidden" id="step-3">
        <h2 class="step-title">Endereço <span class="opt" style="font-size:13px;font-weight:600;color:var(--text-muted)">(Opcional)</span></h2>
        <p class="step-sub">Informe o CEP para preenchermos o restante automaticamente.</p>

        <div class="grid grid-3" style="margin-bottom:14px">
          <div class="field" style="margin-bottom:0">
            <label>CEP</label>
            <input type="text" id="cep" placeholder="00000-000" inputmode="numeric" />
          </div>
          <div class="field col-2" style="margin-bottom:0">
            <label>Rua / Logradouro</label>
            <input type="text" id="endereco" />
          </div>
        </div>
        <div class="grid grid-3" style="margin-bottom:14px">
          <div class="field" style="margin-bottom:0">
            <label>Número</label>
            <input type="text" id="numero" />
          </div>
          <div class="field col-2" style="margin-bottom:0">
            <label>Bairro</label>
            <input type="text" id="bairro" />
          </div>
        </div>
        <div class="grid grid-3">
          <div class="field col-2" style="margin-bottom:0">
            <label>Cidade</label>
            <input type="text" id="cidade" />
          </div>
          <div class="field" style="margin-bottom:0">
            <label>UF</label>
            <input type="text" id="uf" maxlength="2" class="uppercase" />
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-ghost" data-prev>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Voltar
          </button>
          <button type="button" class="btn btn-primary" data-next>Continuar
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </section>

      <!-- PASSO 4 -->
      <section class="step hidden" id="step-4">
        <h2 class="step-title">Sobre o seu projeto</h2>
        <p class="step-sub">Últimos detalhes para conhecermos melhor sua necessidade.</p>

        <div class="field">
          <label>Tipo de imóvel</label>
          <select id="tipo_imovel">
            <option value="CASA">Casa Residencial</option>
            <option value="APARTAMENTO">Apartamento</option>
            <option value="COMERCIAL">Comercial / Escritório</option>
            <option value="SOBRADO">Sobrado / Triplex</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>
        <div class="field">
          <label>Observações <span class="opt">(Opcional)</span></label>
          <textarea id="observacoes" rows="4" placeholder="Conte o que você procura: ambientes, estilo, prazos, preferências..."></textarea>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-ghost" data-prev>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Voltar
          </button>
          <button type="button" class="btn btn-submit" id="submit-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Enviar Cadastro
          </button>
        </div>
      </section>
    </div>
  </div>

  <!-- SUCESSO -->
  <div class="wrap hidden" id="success-wrap">
    <div class="card success">
      <div class="badge">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <h2>Cadastro enviado!</h2>
      <p>Recebemos seus dados. Nossa equipe já pode dar sequência ao seu atendimento e entrará em contato em breve.</p>
      <div class="channels">
        <div class="lbl">Canais Oficiais</div>
        <div class="channels-grid">
          <a class="channel" href="https://www.instagram.com/moveisunghero/" target="_blank" rel="noreferrer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            Instagram
          </a>
          <a class="channel" href="https://wa.me/5554999971050" target="_blank" rel="noreferrer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    © <?php echo date('Y'); ?> Móveis Unghero — Farroupilha/RS ·
    <a href="https://moveisunghero.com.br">moveisunghero.com.br</a>
  </div>

  <script>
    (function () {
      var API_URL = "https://admin.moveisunghero.com.br/api/public/client-signup";
      var DRAFT_KEY = "moveis_unghero_cliente_draft";
      var TOTAL_STEPS = 4;

      var state = { step: 1, tipoPessoa: "PF" };
      var FIELDS = ["documento","nome","telefone","email","cep","endereco","numero","bairro","cidade","uf","tipo_imovel","observacoes"];

      var el = function (id) { return document.getElementById(id); };
      var bar = el("progress-bar");
      var progressLabel = el("progress-label");
      var alertBox = el("alert");
      var alertMsg = el("alert-msg");
      var alertTimer = null;

      function showAlert(msg) {
        alertMsg.textContent = msg;
        alertBox.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (alertTimer) clearTimeout(alertTimer);
        alertTimer = setTimeout(function () { alertBox.classList.add("hidden"); }, 5000);
      }
      function hideAlert() { alertBox.classList.add("hidden"); }

      function updateProgress() {
        var pct = Math.round(((state.step - 1) / (TOTAL_STEPS - 1)) * 100);
        bar.style.width = pct + "%";
        progressLabel.textContent = pct + "% Concluído";
      }

      function renderStep() {
        for (var i = 1; i <= TOTAL_STEPS; i++) {
          el("step-" + i).classList.toggle("hidden", i !== state.step);
        }
        updateProgress();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function setTipo(tipo) {
        state.tipoPessoa = tipo;
        el("btn-pf").classList.toggle("active", tipo === "PF");
        el("btn-pj").classList.toggle("active", tipo === "PJ");
        el("doc-label").childNodes[0].nodeValue = (tipo === "PJ" ? "CNPJ da Empresa " : "CPF ");
        el("documento").placeholder = tipo === "PJ" ? "00.000.000/0001-00" : "000.000.000-00";
        el("nome-label").textContent = (tipo === "PF" ? "Nome completo *" : "Razão social / Nome fantasia *");
        el("nome").placeholder = tipo === "PF" ? "Ex: João da Silva" : "Ex: Marcenaria Alfa Ltda";
      }

      function collect() {
        var d = { tipo_pessoa: state.tipoPessoa };
        FIELDS.forEach(function (f) { d[f] = (el(f).value || "").trim(); });
        return d;
      }

      function saveDraft() {
        try {
          var d = collect();
          d.step = state.step;
          d.tipoPessoa = state.tipoPessoa;
          localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
        } catch (e) {}
      }

      function loadDraft() {
        try {
          var raw = localStorage.getItem(DRAFT_KEY);
          if (!raw) return;
          var d = JSON.parse(raw);
          if (d.tipoPessoa) setTipo(d.tipoPessoa);
          FIELDS.forEach(function (f) { if (d[f] != null) el(f).value = d[f]; });
          if (d.step && d.step >= 1 && d.step <= TOTAL_STEPS) state.step = d.step;
        } catch (e) {}
      }

      // Máscara de telefone
      function maskPhone(v) {
        v = (v || "").replace(/\D/g, "").slice(0, 11);
        if (v.length > 6) return "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7);
        if (v.length > 2) return "(" + v.slice(0, 2) + ") " + v.slice(2);
        if (v.length > 0) return "(" + v;
        return "";
      }

      // Autofill CEP (ViaCEP)
      function fetchCep(cep) {
        var clean = (cep || "").replace(/\D/g, "");
        if (clean.length !== 8) return;
        fetch("https://viacep.com.br/ws/" + clean + "/json/")
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j.erro) return;
            if (j.logradouro) el("endereco").value = j.logradouro;
            if (j.bairro) el("bairro").value = j.bairro;
            if (j.localidade) el("cidade").value = j.localidade;
            if (j.uf) el("uf").value = j.uf;
            saveDraft();
          })
          .catch(function () {});
      }

      // Autofill CNPJ (BrasilAPI)
      function fetchCnpj(cnpj) {
        var clean = (cnpj || "").replace(/\D/g, "");
        if (clean.length !== 14) return;
        var sp = el("doc-spinner");
        sp.classList.remove("hidden");
        fetch("https://brasilapi.com.br/api/cnpj/v1/" + clean)
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && !j.message) {
              if (j.nome_fantasia || j.razao_social) el("nome").value = j.nome_fantasia || j.razao_social;
              if (j.email) el("email").value = (j.email || "").toLowerCase();
              if (j.cep) el("cep").value = j.cep;
              if (j.logradouro) el("endereco").value = j.logradouro;
              if (j.numero) el("numero").value = j.numero;
              if (j.bairro) el("bairro").value = j.bairro;
              if (j.municipio) el("cidade").value = j.municipio;
              if (j.uf) el("uf").value = j.uf;
              saveDraft();
            }
          })
          .catch(function () {})
          .finally(function () { sp.classList.add("hidden"); });
      }

      function next() {
        hideAlert();
        if (state.step === 2) {
          if (!el("nome").value.trim() || !el("telefone").value.trim()) {
            showAlert("Por favor, preencha seu nome e telefone/WhatsApp.");
            return;
          }
        }
        state.step = Math.min(state.step + 1, TOTAL_STEPS);
        saveDraft();
        renderStep();
      }
      function prev() {
        hideAlert();
        state.step = Math.max(1, state.step - 1);
        saveDraft();
        renderStep();
      }

      function submit() {
        hideAlert();
        var data = collect();
        if (!data.nome || !data.telefone) {
          state.step = 2; renderStep();
          showAlert("Por favor, preencha seu nome e telefone/WhatsApp.");
          return;
        }
        var btn = el("submit-btn");
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Enviando...';

        fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        })
          .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
          .then(function (res) {
            if (res && res.success) {
              try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
              el("form-wrap").classList.add("hidden");
              el("success-wrap").classList.remove("hidden");
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            resetSubmit(btn);
            showAlert((res && res.error) || "Não foi possível enviar o cadastro. Tente novamente.");
          })
          .catch(function () {
            resetSubmit(btn);
            showAlert("Falha de conexão. Verifique sua internet e tente novamente.");
          });
      }
      function resetSubmit(btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar Cadastro';
      }

      // Listeners
      el("btn-pf").addEventListener("click", function () { setTipo("PF"); saveDraft(); });
      el("btn-pj").addEventListener("click", function () { setTipo("PJ"); saveDraft(); });

      el("documento").addEventListener("input", function () {
        if (state.tipoPessoa === "PJ") fetchCnpj(this.value);
        saveDraft();
      });
      el("telefone").addEventListener("input", function () { this.value = maskPhone(this.value); saveDraft(); });
      el("cep").addEventListener("input", function () { fetchCep(this.value); saveDraft(); });
      el("uf").addEventListener("input", function () { this.value = this.value.toUpperCase().slice(0, 2); saveDraft(); });

      FIELDS.forEach(function (f) {
        var node = el(f);
        if (f !== "telefone" && f !== "documento" && f !== "cep" && f !== "uf") {
          node.addEventListener("input", saveDraft);
        }
      });

      Array.prototype.forEach.call(document.querySelectorAll("[data-next]"), function (b) { b.addEventListener("click", next); });
      Array.prototype.forEach.call(document.querySelectorAll("[data-prev]"), function (b) { b.addEventListener("click", prev); });
      el("submit-btn").addEventListener("click", submit);

      // Init
      loadDraft();
      setTipo(state.tipoPessoa);
      renderStep();
    })();
  </script>
</body>
</html>
