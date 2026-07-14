<?php
/**
 * Formulário de qualificação (briefing) em moveisunghero.com.br/orcamento.
 *
 * A URL permanece no site institucional, mas o formulário exibido é a
 * página do painel (admin.moveisunghero.com.br/briefing) embutida em um
 * iframe em tela cheia. O layout acompanha o deploy do painel (Vercel) e
 * este arquivo NÃO precisa ser atualizado quando o formulário muda.
 *
 * Upload via cPanel (uma única vez): public_html/orcamento/index.php
 */
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Solicitar Orçamento | Móveis Unghero</title>
  <link rel="icon" href="https://admin.moveisunghero.com.br/favicon.ico" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #020617; }
    body { overflow: hidden; }
    #form-frame {
      position: fixed; inset: 0; width: 100%; height: 100%;
      border: 0; display: block;
    }
    #loading {
      position: fixed; inset: 0; z-index: -1;
      display: flex; align-items: center; justify-content: center;
      background: #020617;
    }
    .spin {
      width: 40px; height: 40px; border-radius: 50%;
      border: 3px solid rgba(250,178,7,.25); border-top-color: #fab207;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loading"><div class="spin"></div></div>
  <iframe
    id="form-frame"
    src="https://admin.moveisunghero.com.br/briefing"
    title="Solicitar Orçamento — Móveis Unghero"
    allow="clipboard-write"
  ></iframe>
</body>
</html>
