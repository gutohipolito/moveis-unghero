<?php
/**
 * Formulário de cadastro de cliente servido diretamente em
 * moveisunghero.com.br/cadastro (sem redirecionar — a URL permanece).
 *
 * Layout espelhado da versão do painel (admin.moveisunghero.com.br/cadastro):
 * página escura com fundo de fábrica + logo, card branco e acento dourado.
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
  <link rel="icon" href="https://admin.moveisunghero.com.br/favicon.ico" />
  <style>
    :root {
      --primary: hsl(42 96% 44%);
      --primary-fg: hsl(24 20% 10%);
      --slate-50: #f8fafc;  --slate-100: #f1f5f9; --slate-200: #e2e8f0;
      --slate-300: #cbd5e1; --slate-350: #b4c0d0; --slate-400: #94a3b8;
      --slate-500: #64748b; --slate-600: #475569; --slate-700: #334155;
      --slate-800: #1e293b; --slate-900: #0f172a; --slate-950: #020617;
      --blue-600: #2563eb;  --purple-600: #9333ea;
      --emerald-600: #059669; --emerald-700: #047857;
      --rose-50: #fff1f2; --rose-200: #fecdd3; --rose-600: #e11d48; --rose-800: #9f1239;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--slate-950);
      color: var(--slate-100);
      min-height: 100vh;
      position: relative;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .bg-overlay {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: url("https://admin.moveisunghero.com.br/factory-bg.png") center / cover no-repeat;
      opacity: .15; filter: brightness(.20) contrast(1.15) grayscale(.2);
    }

    .main {
      position: relative; z-index: 10; flex: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      width: 100%; padding: 48px 16px;
    }
    .logo-wrap { margin-bottom: 24px; }
    .logo-wrap img { height: 40px; width: auto; object-fit: contain; }

    .wrap { width: 100%; max-width: 42rem; padding: 0 8px; }

    /* Barra de progresso */
    .progress { margin-bottom: 32px; }
    .progress-head {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 10px; font-weight: 900; letter-spacing: .12em;
      text-transform: uppercase; color: var(--slate-400); margin-bottom: 8px;
    }
    .progress-track { height: 6px; background: var(--slate-100); border-radius: 999px; overflow: hidden; }
    .progress-bar { height: 100%; width: 0%; background: var(--primary); border-radius: 999px; transition: width .3s ease-out; }

    /* Card branco */
    .card {
      background: #fff;
      border: 1px solid rgba(226,232,240,.8);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
    }
    @media (min-width: 768px) { .card { padding: 32px; } }

    .step { }
    .step.hidden, .hidden { display: none !important; }
    .fade { animation: fade .3s ease; }
    @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

    .step-title { font-size: 18px; font-weight: 900; line-height: 1.2; color: var(--slate-900); }
    .step-sub { font-size: 12px; color: var(--slate-400); font-weight: 600; margin-top: 6px; margin-bottom: 24px; }

    .field { margin-bottom: 16px; }
    .lbl { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--slate-700); margin-bottom: 6px; }
    .lbl svg { color: var(--slate-400); flex-shrink: 0; }
    .lbl .opt { color: var(--slate-400); font-weight: 600; }

    .input {
      width: 100%; border: 1px solid var(--slate-200); background: #fff; color: var(--slate-900);
      border-radius: 12px; padding: 14px; font-size: 12px; font-weight: 600; font-family: inherit;
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .input::placeholder { color: var(--slate-400); font-weight: 500; }
    .input:focus { border-color: var(--slate-800); box-shadow: 0 0 0 1px var(--slate-800); }
    textarea.input { resize: none; }
    select.input {
      cursor: pointer; appearance: none; padding-right: 38px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2394a3b8' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 13px center;
    }
    .input.uppercase { text-transform: uppercase; }

    .grid { display: grid; gap: 16px; }
    @media (min-width: 640px) {
      .grid-2 { grid-template-columns: 1fr 1fr; }
      .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      .col-2 { grid-column: span 2; }
    }

    /* Seleção PF / PJ */
    .type-grid { display: grid; gap: 12px; grid-template-columns: 1fr; margin-bottom: 24px; }
    @media (min-width: 640px) { .type-grid { grid-template-columns: 1fr 1fr; } }
    .type-btn {
      text-align: left; background: #fff; border: 1px solid var(--slate-200); border-radius: 16px;
      padding: 16px; cursor: pointer; font-family: inherit; transition: all .15s;
      display: flex; align-items: center; gap: 12px;
    }
    .type-btn:hover { border-color: var(--slate-350); }
    .type-btn.active { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); background: hsl(42 96% 44% / .05); }
    .type-btn .ico { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
    .type-btn .ico.pf { background: rgba(37,99,235,.10); color: var(--blue-600); }
    .type-btn .ico.pj { background: rgba(147,51,234,.10); color: var(--purple-600); }
    .type-btn .t1 { font-size: 14px; font-weight: 700; color: var(--slate-900); }
    .type-btn .t2 { font-size: 11px; color: var(--slate-400); font-weight: 600; margin-top: 2px; }

    /* Ações / botões */
    .actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; padding-top: 8px; }
    .actions.end { justify-content: flex-end; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      font-family: inherit; font-weight: 700; font-size: 12px; border-radius: 8px;
      cursor: pointer; border: 1px solid transparent; transition: all .15s;
    }
    .btn-continue { padding: 10px 20px; background: var(--primary); color: var(--primary-fg); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
    .btn-continue:hover { filter: brightness(.96); }
    .btn-back { padding: 8px 16px; background: #fff; border-color: var(--slate-200); color: var(--slate-600); }
    .btn-back:hover { background: var(--slate-50); }
    .btn-submit { padding: 12px 24px; background: var(--emerald-600); color: #fff; font-weight: 900; box-shadow: 0 4px 6px rgba(0,0,0,.1); }
    .btn-submit:hover { background: var(--emerald-700); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    .alert {
      display: flex; align-items: center; gap: 10px; background: var(--rose-50);
      border: 1px solid var(--rose-200); color: var(--rose-800); font-size: 12px; font-weight: 700;
      border-radius: 12px; padding: 16px; margin-bottom: 24px;
    }
    .alert svg { color: var(--rose-600); flex-shrink: 0; }
    .alert .close { margin-left: auto; background: none; border: none; color: var(--rose-600); font-size: 18px; font-weight: 800; cursor: pointer; line-height: 1; }

    .spinner { width: 14px; height: 14px; border: 2px solid rgba(148,163,184,.4); border-top-color: var(--slate-500); border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
    .btn-submit .spinner { border-color: rgba(255,255,255,.45); border-top-color: #fff; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Sucesso */
    .success { text-align: center; padding: 40px 8px; }
    .success .badge { width: 88px; height: 88px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 28px; background: rgba(16,185,129,.10); border: 1px solid rgba(16,185,129,.20); color: var(--emerald-600); }
    .success h2 { font-size: 24px; font-weight: 900; color: var(--slate-900); letter-spacing: -.02em; }
    .success p { color: var(--slate-500); font-size: 14px; font-weight: 500; max-width: 24rem; margin: 12px auto 0; line-height: 1.6; }
    .channels { margin: 32px auto 0; background: var(--slate-50); border: 1px solid rgba(226,232,240,.8); border-radius: 16px; padding: 20px; max-width: 24rem; box-shadow: inset 0 2px 4px rgba(0,0,0,.03); }
    .channels .lbl-t { font-size: 12px; font-weight: 700; color: var(--slate-800); text-transform: uppercase; letter-spacing: .14em; text-align: center; }
    .channels-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
    .channel { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px; aspect-ratio: 1 / 1; background: #fff; border: 1px solid var(--slate-200); border-radius: 16px; text-decoration: none; color: var(--slate-700); font-size: 12px; font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,.05); transition: transform .15s; }
    .channel:hover { transform: scale(1.02); }

    /* Rodapé */
    .footer { position: relative; z-index: 10; width: 100%; border-top: 1px solid rgba(15,23,42,.6); background: rgba(2,6,23,.8); backdrop-filter: blur(4px); padding: 24px 16px; text-align: center; }
    .footer .lgpd { max-width: 28rem; margin: 0 auto 12px; font-size: 10px; font-weight: 500; color: #475569; line-height: 1.6; }
    .footer .copy { font-size: 12px; font-weight: 700; color: var(--slate-500); }
    .footer .sub { font-size: 10px; font-weight: 600; color: #475569; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="bg-overlay"></div>

  <div class="main">
    <div class="logo-wrap">
      <img src="https://admin.moveisunghero.com.br/logo.png" alt="Móveis Unghero" />
    </div>

    <div class="wrap" id="form-wrap">
      <div class="progress">
        <div class="progress-head">
          <span>Cadastro de Cliente</span>
          <span id="progress-label">0% Concluído</span>
        </div>
        <div class="progress-track"><div class="progress-bar" id="progress-bar"></div></div>
      </div>

      <div class="card">
        <div class="alert hidden" id="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span id="alert-msg"></span>
          <button type="button" class="close" id="alert-close">&times;</button>
        </div>

        <!-- PASSO 1 -->
        <section class="step fade" id="step-1">
          <h2 class="step-title">Como é o seu cadastro?</h2>
          <p class="step-sub">Escolha pessoa física ou jurídica. Se for empresa, o CNPJ preenche seus dados.</p>

          <div class="type-grid">
            <button type="button" class="type-btn active" data-tipo="PF" id="btn-pf">
              <span class="ico pf">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <span><span class="t1">Pessoa Física</span><br><span class="t2">PF — CPF</span></span>
            </button>
            <button type="button" class="type-btn" data-tipo="PJ" id="btn-pj">
              <span class="ico pj">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
              </span>
              <span><span class="t1">Pessoa Jurídica</span><br><span class="t2">PJ — CNPJ</span></span>
            </button>
          </div>

          <div class="field">
            <label class="lbl"><span id="doc-label-text">CPF (Opcional)</span> <span id="doc-spinner" class="spinner hidden"></span></label>
            <input type="text" id="documento" class="input" placeholder="000.000.000-00" inputmode="numeric" />
          </div>

          <div class="actions end">
            <button type="button" class="btn btn-continue" data-next>Continuar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </section>

        <!-- PASSO 2 -->
        <section class="step fade hidden" id="step-2">
          <h2 class="step-title">Seus dados de contato</h2>
          <p class="step-sub">Precisamos do nome e do WhatsApp para falar com você.</p>

          <div class="field">
            <label class="lbl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span id="nome-label-text">Nome completo *</span>
            </label>
            <input type="text" id="nome" class="input" placeholder="Ex: João da Silva" />
          </div>
          <div class="grid grid-2">
            <div class="field">
              <label class="lbl">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                WhatsApp / Telefone *
              </label>
              <input type="tel" id="telefone" class="input" placeholder="(54) 99999-9999" inputmode="numeric" />
            </div>
            <div class="field">
              <label class="lbl">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                E-mail <span class="opt">(Opcional)</span>
              </label>
              <input type="email" id="email" class="input" placeholder="voce@exemplo.com" />
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn btn-back" data-prev>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Voltar
            </button>
            <button type="button" class="btn btn-continue" data-next>Continuar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </section>

        <!-- PASSO 3 -->
        <section class="step fade hidden" id="step-3">
          <h2 class="step-title">Endereço <span style="font-size:13px;font-weight:600;color:var(--slate-400)">(Opcional)</span></h2>
          <p class="step-sub">Informe o CEP para preenchermos o restante automaticamente.</p>

          <div class="grid grid-3" style="margin-bottom:16px">
            <div class="field" style="margin-bottom:0">
              <label class="lbl">CEP</label>
              <input type="text" id="cep" class="input" placeholder="00000-000" inputmode="numeric" />
            </div>
            <div class="field col-2" style="margin-bottom:0">
              <label class="lbl">Rua / Logradouro</label>
              <input type="text" id="endereco" class="input" />
            </div>
          </div>
          <div class="grid grid-3" style="margin-bottom:16px">
            <div class="field" style="margin-bottom:0">
              <label class="lbl">Número</label>
              <input type="text" id="numero" class="input" />
            </div>
            <div class="field col-2" style="margin-bottom:0">
              <label class="lbl">Bairro</label>
              <input type="text" id="bairro" class="input" />
            </div>
          </div>
          <div class="grid grid-3">
            <div class="field col-2" style="margin-bottom:0">
              <label class="lbl">Cidade</label>
              <input type="text" id="cidade" class="input" />
            </div>
            <div class="field" style="margin-bottom:0">
              <label class="lbl">UF</label>
              <input type="text" id="uf" class="input uppercase" maxlength="2" />
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn btn-back" data-prev>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Voltar
            </button>
            <button type="button" class="btn btn-continue" data-next>Continuar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </section>

        <!-- PASSO 4 -->
        <section class="step fade hidden" id="step-4">
          <h2 class="step-title">Sobre o seu projeto</h2>
          <p class="step-sub">Últimos detalhes para conhecermos melhor sua necessidade.</p>

          <div class="field">
            <label class="lbl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Tipo de imóvel
            </label>
            <select id="tipo_imovel" class="input">
              <option value="CASA">Casa Residencial</option>
              <option value="APARTAMENTO">Apartamento</option>
              <option value="COMERCIAL">Comercial / Escritório</option>
              <option value="SOBRADO">Sobrado / Triplex</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div class="field">
            <label class="lbl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              Observações <span class="opt">(Opcional)</span>
            </label>
            <textarea id="observacoes" class="input" rows="4" placeholder="Conte o que você procura: ambientes, estilo, prazos, preferências..."></textarea>
          </div>

          <div class="actions">
            <button type="button" class="btn btn-back" data-prev>
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
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h2>Cadastro enviado!</h2>
        <p>Recebemos seus dados. Nossa equipe já pode dar sequência ao seu atendimento e entrará em contato em breve.</p>
        <div class="channels">
          <div class="lbl-t">Canais Oficiais</div>
          <div class="channels-grid">
            <a class="channel" href="https://www.instagram.com/moveisunghero/" target="_blank" rel="noreferrer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#db2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              Instagram
            </a>
            <a class="channel" href="https://wa.me/5554999971050" target="_blank" rel="noreferrer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <footer class="footer">
    <p class="lgpd">
      De acordo com a Lei Geral de Proteção de Dados (LGPD), as informações enviadas neste formulário serão tratadas com total confidencialidade e utilizadas apenas para prestar o atendimento comercial e enviar o orçamento solicitado.
    </p>
    <p class="copy">© <?php echo date('Y'); ?> Móveis Unghero — Todos os direitos reservados.</p>
    <p class="sub">Farroupilha · RS · desde 2006</p>
  </footer>

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
        el("doc-label-text").textContent = tipo === "PJ" ? "CNPJ da Empresa (Opcional)" : "CPF (Opcional)";
        el("documento").placeholder = tipo === "PJ" ? "00.000.000/0001-00" : "000.000.000-00";
        el("nome-label-text").textContent = tipo === "PF" ? "Nome completo *" : "Razão social / Nome fantasia *";
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

      function maskPhone(v) {
        v = (v || "").replace(/\D/g, "").slice(0, 11);
        if (v.length > 6) return "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7);
        if (v.length > 2) return "(" + v.slice(0, 2) + ") " + v.slice(2);
        if (v.length > 0) return "(" + v;
        return "";
      }

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

      el("btn-pf").addEventListener("click", function () { setTipo("PF"); saveDraft(); });
      el("btn-pj").addEventListener("click", function () { setTipo("PJ"); saveDraft(); });
      el("alert-close").addEventListener("click", hideAlert);

      el("documento").addEventListener("input", function () {
        if (state.tipoPessoa === "PJ") fetchCnpj(this.value);
        saveDraft();
      });
      el("telefone").addEventListener("input", function () { this.value = maskPhone(this.value); saveDraft(); });
      el("cep").addEventListener("input", function () { fetchCep(this.value); saveDraft(); });
      el("uf").addEventListener("input", function () { this.value = this.value.toUpperCase().slice(0, 2); saveDraft(); });

      FIELDS.forEach(function (f) {
        if (f !== "telefone" && f !== "documento" && f !== "cep" && f !== "uf") {
          el(f).addEventListener("input", saveDraft);
        }
      });

      Array.prototype.forEach.call(document.querySelectorAll("[data-next]"), function (b) { b.addEventListener("click", next); });
      Array.prototype.forEach.call(document.querySelectorAll("[data-prev]"), function (b) { b.addEventListener("click", prev); });
      el("submit-btn").addEventListener("click", submit);

      loadDraft();
      setTipo(state.tipoPessoa);
      renderStep();
    })();
  </script>
</body>
</html>
